import { GoogleCalendarService } from '../services/googleCalendar.service.js';

export class GoogleCalendarController {
   constructor() {
      this.googleCalendarService = new GoogleCalendarService();
   }

   exchangeCode = async (req, res) => {
      try {
         const { code, location } = req.body;
         if (!code) {
            return res.status(400).json({ error: 'Authorization code is required' });
         }
         let tokens;
         if (location) {
            tokens = await this.googleCalendarService.exchangeCodeForTokens(code, location);
         } else {
            tokens = await this.googleCalendarService.exchangeCodeForTokens(code);
         }
         const updatedUser = await this.googleCalendarService.updateUserGoogleTokens(req.user.id, tokens);
         return res.json({ updatedUser, success: true });
      } catch (error) {
         console.error('Error exchanging code:', error);
         return res.status(500).json({
            error: 'Failed to connect to Google Calendar',
            details: error.message
         });
      }
   }

   listCalendars = async (req, res) => {
      try {
         const calendars = await this.googleCalendarService.listCalendars(req.user.id);
         return res.json(calendars);
      } catch (error) {
         console.error('Error listing calendars:', error);
         return res.status(500).json({
            error: 'Failed to fetch calendars',
            details: error.message
         });
      }
   }

   disconnect = async (req, res) => {
      try {
         await this.googleCalendarService.disconnectUser(req.user.id);
         return res.json({ success: true });
      } catch (error) {
         console.error('Error disconnecting:', error);
         return res.status(500).json({
            error: 'Failed to disconnect from Google Calendar',
            details: error.message
         });
      }
   }
}