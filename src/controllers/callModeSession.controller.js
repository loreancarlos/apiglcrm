import { CallModeSessionService } from '../services/callModeSession.service.js';

export class CallModeSessionController {
   constructor() {
      this.callModeSessionService = new CallModeSessionService();
   }

   create = async (req, res) => {
      try {
         const userId = req.user.id;
         console.log(req.body);
         const session = await this.callModeSessionService.create({
            ...req.body, userId
         });
         console.log(session);
         return res.status(201).json(session);
      } catch (error) {
         return res.status(500).json({ error: 'Erro interno do servidor' });
      }
   }

   list = async (req, res) => {
      try {
         const sessions = await this.callModeSessionService.list();
         return res.json(sessions);
      } catch (error) {
         return res.status(500).json({ error: 'Erro interno do servidor' });
      }
   }

   update = async (req, res) => {
      try {
         const session = await this.callModeSessionService.update(req.params.id, req.body);
         return res.json(session);
      } catch (error) {
         return res.status(500).json({ error: 'Erro interno do servidor' });
      }
   }
}