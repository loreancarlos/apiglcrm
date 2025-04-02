export class GoogleCalendarService {
  async refreshAccessToken(refreshToken) {
    try {
      const response = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: process.env.CLIENT_ID,
          client_secret: process.env.CLIENT_SECRET,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh access token');
      }

      const data = await response.json();
      return data.access_token;
    } catch (error) {
      console.error('Error refreshing access token:', error);
      throw error;
    }
  }

  async makeRequest(accessToken, refreshToken, requestFn) {
    try {
      return await requestFn(accessToken);
    } catch (error) {
      if (error.status === 401 && refreshToken) {
        // Token expirado, tenta renovar
        const newAccessToken = await this.refreshAccessToken(refreshToken);
        // Tenta a requisição novamente com o novo token
        return await requestFn(newAccessToken);
      }
      throw error;
    }
  }

  async createEvent(accessToken, calendarId, data, refreshToken) {
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

    return this.makeRequest(accessToken, refreshToken, createEventRequest);
  }

  async updateEvent(accessToken, calendarId, eventId, data, refreshToken) {
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

    return this.makeRequest(accessToken, refreshToken, updateEventRequest);
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