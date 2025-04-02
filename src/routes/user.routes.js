import { Router } from 'express';
import { UserController } from '../controllers/user.controller.js';
import { adminMiddleware } from '../middlewares/admin.middleware.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const userRoutes = Router();
const userController = new UserController();

userRoutes.get('/', userController.list);
userRoutes.post('/', adminMiddleware, userController.create);
userRoutes.get('/:id', adminMiddleware, userController.show);
userRoutes.put('/:id', adminMiddleware, userController.update);
userRoutes.delete('/:id', adminMiddleware, userController.delete);
userRoutes.patch('/:id/toggle-status', adminMiddleware, userController.toggleStatus);
userRoutes.put('/:id/google-calendar', authMiddleware, userController.updateGoogleCalendar);

export { userRoutes };