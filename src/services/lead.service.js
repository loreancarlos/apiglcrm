import db from '../database/connection.js';
import { wsManager } from '../websocket/websocketServer.js';

export class LeadService {
  async list(brokerId = null, teamId = null) {
    let query = db('leads')
      .select(
        'leads.id',
        'leads.name',
        'leads.phone',
        'leads.developmentsInterest',
        'leads.lastContact',
      )
      .orderBy('name');

    if (brokerId) {
      query = query.join('business', 'business.leadId', '=', 'leads.id')
        .where('business.brokerId', brokerId);
    }

    if (teamId) {
      query = query.leftJoin('business', 'business.leadId', 'leads.id')
        .whereIn('business.brokerId', function () {
          this.select('id').from('users').where('teamId', teamId);
        });
    }

    return query;
  }

  async create(data) {
    if (data.developmentsInterest.length == 0) {
      throw new Error('LEAD_DONT_HAS_DEVELOPMENTS');
    }

    const [lead] = await db('leads')
      .insert(data)
      .returning('*');

    // Notificar todos os clientes conectados sobre o novo lead
    wsManager.broadcastUpdate('NEW_LEAD', lead);

    return lead;
  }

  async findByPhone(phone) {
    return db('leads')
      .select('*')
      .where('leads.phone', phone)
      .first();
  }

  async findById(id, brokerId = null) {
    let query = db('leads')
      .select('*')
      .join('business', 'business.leadId', '=', 'leads.id')
      .where('leads.id', id);

    if (brokerId) {
      query = query.where('business.brokerId', brokerId);
    }

    return query.first();
  }

  async findByIdForTeamLeader(id, leaderId, teamId) {
    return db('leads')
      .select('*')
      .join('business', 'business.leadId', '=', 'leads.id')
      .where('leads.id', id)
      .andWhere(function () {
        this.where('business.brokerId', leaderId)
          .orWhereIn('business.brokerId', function () {
            this.select('id').from('users').where('teamId', teamId);
          });
      })
      .first();
  }

  async update(id, data) {
    let query = db('leads').where({ id });

    const [lead] = await query
      .update(data)
      .returning('*');

    return lead;
  }

  async updateForTeamLeader(id, data, leaderId, teamId) {
    const lead = await db('leads')
      .where('id', id)
      .join('business', 'business.leadId', '=', 'leads.id')
      .andWhere(function () {
        this.where('business.brokerId', leaderId)
          .orWhereIn('business.brokerId', function () {
            this.select('id').from('users').where('teamId', teamId);
          });
      })
      .first();

    if (!lead) return null;

    const [updatedLead] = await db('leads')
      .where({ id })
      .update({
        ...data,
        updatedAt: db.fn.now()
      })
      .returning('*');

    return updatedLead;
  }

  async delete(id, brokerId = null) {
    const hasBusiness = await db('business')
      .where({ leadId: id })
      .first();
    if (hasBusiness) {
      throw new Error('LEAD_HAS_BUSINESS');
    }

    let query = db('leads').where({ id });

    if (brokerId) {
      query = query.join('business', 'business.leadId', '=', 'leads.id')
        .where('business.brokerId', brokerId);
    }

    await query.delete();
  }

  async deleteForTeamLeader(id, leaderId, teamId) {
    await db('leads')
      .join('business', 'business.leadId', '=', 'leads.id')
      .where('id', id)
      .andWhere(function () {
        this.where('business.brokerId', leaderId)
          .orWhereIn('business.brokerId', function () {
            this.select('id').from('users').where('teamId', teamId);
          });
      })
      .delete();
  }
}