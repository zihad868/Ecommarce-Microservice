import { Router } from 'express';
import { validateRequest } from '@ecommerce/common';
import { getMe, login, logout, refresh, register } from '../controllers/authController';
import { protect } from '../middlewares/authMiddleware';
import { loginSchema, refreshTokenSchema, registerSchema } from '../validators/authValidators';

const router = Router();

router.post('/register', validateRequest({ body: registerSchema }), register);
router.post('/login', validateRequest({ body: loginSchema }), login);
router.post('/refresh', validateRequest({ body: refreshTokenSchema }), refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);

export default router;
