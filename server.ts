import express, { type Request, type Response, type NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { randomUUID } from 'crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';
const allowUnauthenticatedApi = !isProduction && process.env.ALLOW_UNAUTHENTICATED_API === 'true';
const DEFAULT_TENANT_ID = 'supermarcket-central';

export const app = express();
app.use(express.json({ limit: '10mb' }));
app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  next();
});

type AuthenticatedRequest = Request & { firebaseUser?: DecodedIdToken };
let firebaseAuth: ReturnType<typeof getAuth> | null = null;

function getFirebaseAuth() {
  if (firebaseAuth) return firebaseAuth;
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!serviceAccountJson && !process.env.GOOGLE_APPLICATION_CREDENTIALS) return null;
  if (getApps().length === 0) {
    initializeApp(serviceAccountJson ? { credential: cert(JSON.parse(serviceAccountJson)) } : undefined);
  }
  firebaseAuth = getAuth();
  return firebaseAuth;
}

function getPublicAppUrl() {
  return process.env.APP_URL || (process.env.VERCEL_URL ? 'https://' + process.env.VERCEL_URL : 'http://localhost:3000');
}
function getMercadoPagoToken() {
  const token = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!token) throw new Error('Mercado Pago no está configurado en el servidor.');
  return token;
}
async function mercadoPagoRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { Authorization: 'Bearer ' + getMercadoPagoToken(), 'Content-Type': 'application/json', ...(init?.headers || {}) } });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error('Mercado Pago rechazó la solicitud (' + response.status + ').');
  return data as T;
}
type MercadoPagoPayment = { id: number; status: string; transaction_amount: number; external_reference?: string; date_approved?: string };
async function verifyApprovedMercadoPagoPayment(paymentId: string, externalReference: string, total: number) {
  const payment = await mercadoPagoRequest<MercadoPagoPayment>('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(paymentId));
  const amountMatches = Number(payment.transaction_amount).toFixed(2) === Number(total).toFixed(2);
  if (payment.status !== 'approved' || payment.external_reference !== externalReference || !amountMatches) throw new Error('El pago de Mercado Pago no está aprobado o no coincide con la operación.');
  return payment;
}
async function requireFirebaseAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (allowUnauthenticatedApi) return next();
  const token = req.headers.authorization?.startsWith('Bearer ')
    ? req.headers.authorization.slice(7)
    : '';
  if (!token) return res.status(401).json({ error: 'Autenticación requerida.' });
  try {
    const adminAuth = getFirebaseAuth();
    if (!adminAuth) return res.status(503).json({ error: 'La autenticación del servidor no está configurada.' });
    req.firebaseUser = await adminAuth.verifyIdToken(token);
    return next();
  } catch (_error) {
    return res.status(401).json({ error: 'Token de autenticación inválido o expirado.' });
  }
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'supermarcket-api' }));
app.post('/api/payments/mercadopago/webhook', async (req, res) => {
  const paymentId = String(req.body?.data?.id || req.query.id || '');
  if (!paymentId) return res.status(200).json({ received: true });
  try {
    const payment = await mercadoPagoRequest<MercadoPagoPayment>('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(paymentId));
    if (getFirebaseAuth()) {
      try { await getFirestore().collection('payment_events').doc(String(payment.id)).set({ provider: 'mercadopago', paymentId: String(payment.id), status: payment.status, amount: payment.transaction_amount, externalReference: payment.external_reference || null, dateApproved: payment.date_approved || null, receivedAt: new Date().toISOString() }, { merge: true }); }
      catch (error) { console.warn('[Mercado Pago] No se pudo guardar el webhook en Firestore:', error); }
    }
  } catch (error) { console.error('[Mercado Pago] Error procesando webhook:', error); }
  return res.status(200).json({ received: true });
});
app.use('/api', requireFirebaseAuth);
app.post('/api/payments/mercadopago/preference', async (req: AuthenticatedRequest, res: Response) => {
  const { items, total, cashierId, terminalId } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || !Number.isFinite(Number(total)) || Number(total) <= 0) return res.status(400).json({ error: 'La preferencia requiere productos y un total válido.' });
  const externalReference = 'smk_' + randomUUID();
  try {
    const preference = await mercadoPagoRequest<{ id: string; init_point: string }>('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items: items.map((item: any) => ({ id: String(item.productId), title: String(item.name).slice(0, 120), quantity: Math.max(1, Number(item.quantity)), unit_price: Number(item.unitPrice), currency_id: 'ARS' })),
        external_reference: externalReference,
        notification_url: getPublicAppUrl() + '/api/payments/mercadopago/webhook',
        back_urls: { success: getPublicAppUrl() + '/?payment=success&external_reference=' + externalReference, pending: getPublicAppUrl() + '/?payment=pending&external_reference=' + externalReference, failure: getPublicAppUrl() + '/?payment=failure&external_reference=' + externalReference },
        auto_return: 'approved',
        metadata: { cashierId: cashierId || null, terminalId: terminalId || null },
      }),
    });
    return res.status(201).json({ success: true, preferenceId: preference.id, initPoint: preference.init_point, externalReference });
  } catch (error: any) { return res.status(503).json({ error: error.message || 'No se pudo crear la preferencia de Mercado Pago.' }); }
});
app.get('/api/payments/mercadopago/status', async (req, res) => {
  const externalReference = String(req.query.externalReference || '');
  if (!externalReference) return res.status(400).json({ error: 'externalReference es obligatorio.' });
  try {
    const result = await mercadoPagoRequest<{ results: MercadoPagoPayment[] }>('https://api.mercadopago.com/v1/payments/search?external_reference=' + encodeURIComponent(externalReference) + '&sort=date_created&criteria=desc&limit=10');
    const payment = result.results?.find(item => item.external_reference === externalReference);
    return res.json({ approved: payment?.status === 'approved', status: payment?.status || 'pending', paymentId: payment?.id ? String(payment.id) : null });
  } catch (error: any) { return res.status(503).json({ error: error.message || 'No se pudo consultar el pago en Mercado Pago.' }); }
});

app.post('/api/auth/register-user', async (req: AuthenticatedRequest, res: Response) => {
  if (req.firebaseUser?.role !== 'ADMINISTRADOR') {
    return res.status(403).json({ error: 'Solo un Administrador puede crear usuarios y asignar roles.' });
  }
  const { displayName, email, role, terminalDefault, password, tenantId } = req.body;
  if (!displayName || !email || !role || typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({ error: 'Nombre, email, rol y una contraseña de al menos 6 caracteres son requeridos.' });
  }
  const allowedRoles = ['ADMINISTRADOR', 'ENCARGADO', 'CAJERO', 'REPOSITOR'];
  if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Rol no válido.' });
  const adminAuth = getFirebaseAuth();
  if (!adminAuth) return res.status(503).json({ error: 'Firebase Admin no está configurado.' });
  try {
    const normalizedEmail = String(email).toLowerCase().trim();
    const normalizedTenantId = String(tenantId || DEFAULT_TENANT_ID);
    const firebaseUser = await adminAuth.createUser({
      email: normalizedEmail,
      password,
      displayName: String(displayName).trim(),
    });
    await adminAuth.setCustomUserClaims(firebaseUser.uid, { role, tenantId: normalizedTenantId });
    return res.status(201).json({
      success: true,
      user: {
        userId: firebaseUser.uid,
        displayName: String(displayName).trim(),
        email: normalizedEmail,
        role,
        tenantId: normalizedTenantId,
        terminalDefault: terminalDefault || 'CAJA-01',
      },
    });
  } catch (error: any) {
    if (String(error?.code || '') === 'auth/email-already-exists') {
      return res.status(409).json({ error: 'Ese correo ya tiene una cuenta en Firebase.' });
    }
    console.error('[SuperMarcket Auth] Error al crear usuario:', error);
    return res.status(400).json({ error: 'Firebase rechazó la creación del usuario.' });
  }
});

// No se generan CAE, QR ni comprobantes ficticios. Esta integración requiere ARCA real.
app.all('/api/fiscal/:path*', (_req, res) => {
  res.status(503).json({ error: 'La integración fiscal ARCA aún no está configurada para este comercio.' });
});
app.post('/api/sales/checkout', async (req: AuthenticatedRequest, res: Response) => {
  const { items, total, paymentMethod, paymentId, externalReference, cashierId, cashierName, terminalId, notes } = req.body || {};
  if (paymentMethod !== 'mercado_pago') {
    return res.status(503).json({ error: 'Este checkout requiere Mercado Pago aprobado o una integración fiscal autorizada.' });
  }
  if (!Array.isArray(items) || items.length === 0 || !paymentId || !externalReference || !Number.isFinite(Number(total))) {
    return res.status(400).json({ error: 'Faltan datos de pago para confirmar la venta.' });
  }
  try {
    const payment = await verifyApprovedMercadoPagoPayment(String(paymentId), String(externalReference), Number(total));
    const saleNumber = 'TK-' + String(Date.now()).slice(-7);
    const sale = {
      id: 'sale_' + randomUUID(),
      saleNumber,
      receiptNumber: saleNumber,
      date: new Date().toISOString(),
      items,
      itemCount: items.reduce((sum: number, item: any) => sum + Number(item.quantity || 0), 0),
      subtotal: Number(total),
      discount: 0,
      total: Number(total),
      paymentMethod,
      paymentDetails: { provider: 'mercadopago', paymentId: String(payment.id), status: payment.status, externalReference: String(externalReference) },
      cashierName: cashierName || req.firebaseUser?.name || 'Cajero',
      cashierId: cashierId || req.firebaseUser?.uid || '',
      terminalId: terminalId || '',
      notes: notes || '',
      status: 'completada',
    };
    return res.status(201).json({ success: true, sale });
  } catch (error: any) {
    return res.status(402).json({ error: error.message || 'El pago no pudo ser verificado.' });
  }
});

export async function startServer() {
  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => res.sendFile(path.resolve(__dirname, 'dist', 'index.html')));
  }
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SuperMarcket Server] Servidor activo en puerto ${PORT} (${isProduction ? 'Producción' : 'Desarrollo'})`);
  });
}

if (process.env.VERCEL !== '1') {
  startServer().catch(error => {
    console.error('[SuperMarcket Server] Error fatal al iniciar:', error);
    process.exit(1);
  });
}
