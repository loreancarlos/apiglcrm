import db from '../database/connection.js';

export class GoogleCalendarService {
   async refreshAccessToken(refreshToken) {
      try {
         const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
               client_id: process.env.GOOGLE_CLIENT_ID,
               client_secret: process.env.GOOGLE_CLIENT_SECRET,
               refresh_token: refreshToken,
               grant_type: 'refresh_token',
            }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            console.error('Token refresh error:', errorData);
            throw new Error('Failed to refresh access token: ' + (errorData.error_description || errorData.error));
         }

         const data = await response.json();
         return data.access_token;
      } catch (error) {
         console.error('Error refreshing access token:', error);
         throw error;
      }
   }

   async exchangeCodeForTokens(code, location = null) {
      try {
         if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
            throw new Error('Missing required Google OAuth configuration');
         }

         const response = await fetch('https://oauth2.googleapis.com/token', {
            method: 'POST',
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
               code,
               client_id: process.env.GOOGLE_CLIENT_ID,
               client_secret: process.env.GOOGLE_CLIENT_SECRET,
               redirect_uri: location,
               grant_type: 'authorization_code',
            }),
         });

         if (!response.ok) {
            const errorData = await response.json();
            console.error('Token exchange error:', errorData);
            throw new Error('OAuth configuration error: ' + (errorData.error_description || errorData.error));
         }

         return response.json();
      } catch (error) {
         console.error('Error exchanging code:', error);
         throw new Error(error.message || 'Failed to exchange code for tokens');
      }
   }

   async updateUserGoogleTokens(userId, tokens) {
      const [user] = await db('users')
         .where({ id: userId })
         .update({
            google_calendar_token: tokens.access_token,
            google_calendar_refresh_token: tokens.refresh_token,
         })
         .returning('*');

      return user;
   }

   async listCalendars(userId) {
      const user = await db('users')
         .where({ id: userId })
         .first();

      if (!user?.google_calendar_token) {
         throw new Error('User not connected to Google Calendar');
      }

      try {
         const response = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
            headers: {
               'Authorization': `Bearer ${user.google_calendar_token}`
            }
         });

         if (!response.ok) {
            if (response.status === 401 && user.google_calendar_refresh_token) {
               const newAccessToken = await this.refreshAccessToken(user.google_calendar_refresh_token);
               await db('users')
                  .where({ id: userId })
                  .update({ google_calendar_token: newAccessToken });

               const newResponse = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
                  headers: {
                     'Authorization': `Bearer ${newAccessToken}`
                  }
               });

               if (!newResponse.ok) {
                  const errorData = await newResponse.json();
                  throw new Error('Failed to fetch calendars: ' + (errorData.error_description || errorData.error));
               }

               return newResponse.json();
            }
            const errorData = await response.json();
            throw new Error('Failed to fetch calendars: ' + (errorData.error_description || errorData.error));
         }

         return response.json();
      } catch (error) {
         console.error('Error fetching calendars:', error);
         throw error;
      }
   }

   async disconnectUser(userId) {
      await db('users')
         .where({ id: userId })
         .update({
            google_calendar_token: null,
            google_calendar_refresh_token: null,
            google_calendar_id: null,
         });
   }

   async makeRequest(accessToken, refreshToken, requestFn, brokerId) {
      try {
         return await requestFn(accessToken);
      } catch (error) {
         if (error.status === 401 && refreshToken) {
            const newAccessToken = await this.refreshAccessToken(refreshToken);
            await db('users')
               .where({ id: brokerId })
               .update({ google_calendar_token: newAccessToken });
            return await requestFn(newAccessToken);
         }
         throw error;
      }
   }

   async createEvent(accessToken, calendarId, data, refreshToken, brokerId) {
      const createEventRequest = async (token) => {
         const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`,
            {
               method: 'POST',
               headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                  summary: data.summary,
                  description: data.description,
                  start: {
                     dateTime: new Date(data.startDateTime).toISOString(),
                     timeZone: 'America/Sao_Paulo',
                  },
                  end: {
                     dateTime: new Date(data.endDateTime).toISOString(),
                     timeZone: 'America/Sao_Paulo',
                  },
               }),
            }
         );

         if (!response.ok) {
            const error = await response.json();
            error.status = response.status;
            throw error;
         }

         return response.json();
      };

      return this.makeRequest(accessToken, refreshToken, createEventRequest, brokerId);
   }

   async updateEvent(accessToken, calendarId, eventId, data, refreshToken, brokerId) {
      const updateEventRequest = async (token) => {
         const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
               method: 'PATCH',
               headers: {
                  'Authorization': `Bearer ${token}`,
                  'Content-Type': 'application/json',
               },
               body: JSON.stringify({
                  summary: data.summary,
                  description: data.description,
                  start: {
                     dateTime: new Date(data.startDateTime).toISOString(),
                     timeZone: 'America/Sao_Paulo',
                  },
                  end: {
                     dateTime: new Date(data.endDateTime).toISOString(),
                     timeZone: 'America/Sao_Paulo',
                  },
               }),
            }
         );

         if (!response.ok) {
            const error = await response.json();
            error.status = response.status;
            throw error;
         }

         return response.json();
      };

      return this.makeRequest(accessToken, refreshToken, updateEventRequest, brokerId);
   }

   async deleteEvent(accessToken, calendarId, eventId, refreshToken) {
      const deleteEventRequest = async (token) => {
         const response = await fetch(
            `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}`,
            {
               method: 'DELETE',
               headers: {
                  'Authorization': `Bearer ${token}`,
               },
            }
         );
         if (!response.ok && response.status !== 404) {
            const error = await response.json();
            error.status = response.status;
            throw error;
         }

         return true;
      };

      return this.makeRequest(accessToken, refreshToken, deleteEventRequest);
   }
}