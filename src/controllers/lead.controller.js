import { LeadService } from '../services/lead.service.js';
import { BusinessService } from '../services/business.service.js';
import { wsManager } from '../websocket/websocketServer.js';
import e from 'cors';

export class LeadController {
  constructor() {
    this.leadService = new LeadService();
    this.businessService = new BusinessService();
  }

  list = async (req, res) => {
    try {
      const { role, id, teamId } = req.user;
      let leads;

      if (role === 'admin') {
        leads = await this.leadService.list();
      } else if (role === 'teamLeader') {
        // Busca tanto os leads da equipe quanto os leads pessoais do líder
        const teamLeads = await this.leadService.list(null, teamId);
        const personalLeads = await this.leadService.list(id);
        leads = Array.from(new Map([...teamLeads, ...personalLeads].map(lead => [lead.id, lead])).values());;
      } else {
        leads = await this.leadService.list(id);
      }
      return res.json(leads);
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  create = async (req, res) => {
    try {
      const { role, id } = req.user;
      const data = {
        name: req.body.name,
        phone: req.body.phone,
        developmentsInterest: req.body.developmentsInterest
      };

      // Verifica se o lead já existe pelo telefone
      const existingLead = await this.leadService.findByPhone(req.body.phone);

      if (existingLead) {
        // Se o lead existe, verifica se já tem negócio com o empreendimento atual
        const existingBusinesses = await this.businessService.findByLeadId(existingLead.id);
        for (const development of req.body.developmentsInterest) {
          const hasBusinessWithDevelopment = existingBusinesses.filter(
            business => business.developmentId === development);
          if (hasBusinessWithDevelopment) {
            return res.status(409).json({
              error: `Lead já cadastrado para o ${hasBusinessWithDevelopment[0].developmentName} | ${hasBusinessWithDevelopment[0].brokerName}!`
            });
          }

          // Se não tem negócio com este empreendimento, cria um novo
          const businessData = {
            leadId: existingLead.id,
            developmentId: development,
            source: req.body.source,
            status: "new",
            brokerId: (role === 'broker') ? id : req.body.brokerId
          };
          const newBusiness = await this.businessService.create(businessData);
        }
        return res.status(200).json(existingLead);
      }

      // Se o lead não existe, cria um novo
      if (!data.developmentsInterest || data.developmentsInterest.length === 0) {
        throw new Error('LEAD_DONT_HAS_DEVELOPMENTS');
      }
      const lead = await this.leadService.create(data);

      // Notificar todos os clientes conectados sobre o novo lead
      wsManager.broadcastUpdate('NEW_LEAD', lead);

      // Criar um negócio para cada empreendimento selecionado
      for (const developmentId of lead.developmentsInterest) {
        const businessData = {
          leadId: lead.id,
          developmentId,
          source: req.body.source,
          status: "new",
          brokerId: (role === 'broker') ? id : req.body.brokerId
        };
        const business = await this.businessService.create(businessData);
        wsManager.broadcastUpdate('NEW_BUSINESS', business);

      }

      return res.status(201).json(lead);
    } catch (error) {
      if (error.message === 'LEAD_DONT_HAS_DEVELOPMENTS') {
        return res.status(400).json({ error: 'Nenhum empreendimento selecionado!' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  createImport = async (req, res) => {
    try {
      const { role, id } = req.user;
      const data = {
        name: req.body.name,
        phone: req.body.phone,
        developmentsInterest: req.body.developmentsInterest,
      };

      // Verifica se o lead já existe pelo telefone
      const existingLead = await this.leadService.findByPhone(req.body.phone);

      if (existingLead) {
        // Se o lead existe, verifica se já tem negócio com o empreendimento atual
        const existingBusinesses = await this.businessService.findByLeadId(existingLead.id);
        for (const development of req.body.developmentsInterest) {
          const hasBusinessWithDevelopment = existingBusinesses.filter(
            business => business.developmentId === development);
          if (hasBusinessWithDevelopment) {
            return res.json(hasBusinessWithDevelopment[0]);
          }

          // Se não tem negócio com este empreendimento, cria um novo
          const businessData = {
            leadId: existingLead.id,
            developmentId: development,
            source: req.body.source,
            status: "new",
            brokerId: (role === 'broker') ? id : req.body.brokerId
          };
          const newBusiness = await this.businessService.create(businessData);
        }
        return res.status(200).json(existingLead);
      }

      // Se o lead não existe, cria um novo
      if (!data.developmentsInterest || data.developmentsInterest.length === 0) {
        throw new Error('LEAD_DONT_HAS_DEVELOPMENTS');
      }
      const lead = await this.leadService.create(data);

      // Notificar todos os clientes conectados sobre o novo lead
      wsManager.broadcastUpdate('NEW_LEAD', lead);

      // Criar um negócio para cada empreendimento selecionado
      for (const developmentId of lead.developmentsInterest) {
        const businessData = {
          leadId: lead.id,
          developmentId,
          source: req.body.source,
          status: "new",
          brokerId: (role === 'broker') ? id : req.body.brokerId
        };
        const business = await this.businessService.create(businessData);
        wsManager.broadcastUpdate('NEW_BUSINESS', business);

      }

      return res.status(201).json(lead);
    } catch (error) {
      if (error.message === 'LEAD_DONT_HAS_DEVELOPMENTS') {
        return res.status(400).json({ error: 'Nenhum empreendimento selecionado!' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  show = async (req, res) => {
    try {
      const { role, id, teamId } = req.user;
      let lead;

      if (role === 'admin') {
        lead = await this.leadService.findById(req.params.id);
      } else if (role === 'teamLeader') {
        lead = await this.leadService.findByIdForTeamLeader(req.params.id, id, teamId);
      } else {
        lead = await this.leadService.findById(req.params.id, id);
      }

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }

      return res.json(lead);
    } catch (error) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  update = async (req, res) => {
    try {
      const lead = await this.leadService.update(req.params.id, req.body);

      if (!lead) {
        return res.status(404).json({ error: 'Lead não encontrado' });
      }
      return res.json(lead);
    } catch (error) {
      if (error.message.includes('Lead must be assigned to a broker or team leader')) {
        return res.status(400).json({ error: 'Lead deve ser atribuído a um corretor ou líder de equipe' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  delete = async (req, res) => {
    try {
      const { role, id, teamId } = req.user;

      if (role === 'admin') {
        await this.leadService.delete(req.params.id);
      } else if (role === 'teamLeader') {
        await this.leadService.deleteForTeamLeader(req.params.id, id, teamId);
      } else {
        await this.leadService.delete(req.params.id, id);
      }

      return res.json({ message: 'Lead deletado com sucesso' });
    } catch (error) {
      if (error.message === 'LEAD_HAS_BUSINESS') {
        return res.status(400).json({ error: 'Lead possui negócio e não pode ser excluído!' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }
}