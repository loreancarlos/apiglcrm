import { Router } from 'express';
import { GoogleCalendarController } from '../controllers/googleCalendar.controller.js';
import { authMiddleware } from '../middlewares/auth.middleware.js';

const googleCalendarRoutes = Router();
const googleCalendarController = new GoogleCalendarController();

googleCalendarRoutes.post('/exchange-code', authMiddleware, googleCalendarController.exchangeCode);
googleCalendarRoutes.get('/calendars', authMiddleware, googleCalendarController.listCalendars);
googleCalendarRoutes.post('/disconnect', authMiddleware, googleCalendarController.disconnect);

export { googleCalendarRoutes };