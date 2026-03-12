import { getStore } from "@netlify/blobs";

const MEMBROS_INICIAIS = [
  {id:'sid001',nome:'Sidney Viana',   empresa:'Multvision',           whatsapp:'',instagram:'',role:'membro'},
  {id:'bru002',nome:'Bruno Lima',     empresa:'Bruno Lima Collection', whatsapp:'',instagram:'',role:'membro'},
  {id:'ant003',nome:'Antonio Solar',  empresa:'Cavalcanti Solar',      whatsapp:'',instagram:'',role:'membro'},
  {id:'bre004',nome:'Breno Carrilho', empresa:'',                      whatsapp:'',instagram:'',role:'membro'},
  {id:'cam005',nome:'Camila Marinho', empresa:'Sellecta — Gestora',    whatsapp:'',instagram:'',role:'gestora'},
  {id:'car006',nome:'Carlos Eduardo', empresa:'',                      whatsapp:'',instagram:'',role:'membro'},
  {id:'dan007',nome:'Daniel Metodos', empresa:'Contabilidade',         whatsapp:'',instagram:'',role:'membro'},
  {id:'fel008',nome:'Felipe Corretor',empresa:'Corretor de Imóveis',   whatsapp:'',instagram:'',role:'membro'},
  {id:'luc009',nome:'Lucas Santos',   empresa:'Requin Capital',        whatsapp:'',instagram:'',role:'membro'},
  {id:'mar010',nome:'Marcelo Caminha',empresa:'Clínica',               whatsapp:'',instagram:'',role:'membro'},
];

const H = { 'Content-Type': 'application/json' };
const ok  = (d)        => new Response(JSON.stringify(d),         { status: 200, headers: H });
const err = (m, s=400) => new Response(JSON.stringify({error:m}), { status: s,   headers: H });

export default async (req) => {
  const store  = getStore({ name: 'ss26', consistency: 'strong' });
  const url    = new URL(req.url);
  const action = url.searchParams.get('action');

  try {
    if (action === 'auth' && req.method === 'POST') {
      const { senha } = await req.json();
      const correta = Netlify.env.get('ADMIN_SENHA') || 'S3ll3cta@Stars#26';
      return senha === correta ? ok({ ok: true }) : err('Senha incorreta', 401);
    }

    if (action === 'dados' && req.method === 'GET') {
      let membros = await store.get('membros', { type: 'json' });
      if (!membros) {
        membros = MEMBROS_INICIAIS;
        await store.setJSON('membros', membros);
      }
      const lancamentos = await store.get('lancamentos', { type: 'json' }) || [];
      return ok({ membros, lancamentos });
    }

    if (action === 'salvar-membro' && req.method === 'POST') {
      const novo = await req.json();
      if (!novo.id || !novo.nome || typeof novo.nome !== 'string') return err('Dados inválidos');
      novo.nome = novo.nome.trim().slice(0, 120);
      if (!novo.nome) return err('Nome não pode ser vazio');
      novo.empresa   = (novo.empresa||'').trim().slice(0, 120);
      novo.whatsapp  = (novo.whatsapp||'').trim().slice(0, 30);
      novo.instagram = (novo.instagram||'').trim().slice(0, 60);
      novo.role = ['membro','gestora'].includes(novo.role) ? novo.role : 'membro';
      const membros = await store.get('membros', { type: 'json' }) || [];
      if (membros.some(m => m.id === novo.id)) return err('ID já existe');
      membros.push(novo);
      await store.setJSON('membros', membros);
      return ok({ ok: true });
    }

    if (action === 'editar-membro' && req.method === 'POST') {
      const upd = await req.json();
      if (!upd.id || typeof upd.id !== 'string') return err('ID obrigatório');
      if (upd.nome !== undefined) {
        upd.nome = String(upd.nome).trim().slice(0, 120);
        if (!upd.nome) return err('Nome não pode ser vazio');
      }
      if (upd.empresa   !== undefined) upd.empresa   = String(upd.empresa||'').trim().slice(0, 120);
      if (upd.whatsapp  !== undefined) upd.whatsapp  = String(upd.whatsapp||'').trim().slice(0, 30);
      if (upd.instagram !== undefined) upd.instagram = String(upd.instagram||'').trim().slice(0, 60);
      if (upd.role) upd.role = ['membro','gestora'].includes(upd.role) ? upd.role : 'membro';
      let membros = await store.get('membros', { type: 'json' }) || [];
      membros = membros.map(m => m.id === upd.id ? { ...m, ...upd } : m);
      await store.setJSON('membros', membros);
      return ok({ ok: true });
    }

    if (action === 'remover-membro' && req.method === 'POST') {
      const { id } = await req.json();
      if (!id || typeof id !== 'string') return err('ID obrigatório');
      let membros = await store.get('membros', { type: 'json' }) || [];
      membros = membros.filter(m => m.id !== id);
      await store.setJSON('membros', membros);
      let lancamentos = await store.get('lancamentos', { type: 'json' }) || [];
      lancamentos = lancamentos.filter(l => l.membroId !== id);
      await store.setJSON('lancamentos', lancamentos);
      return ok({ ok: true });
    }

    if (action === 'lancar' && req.method === 'POST') {
      const lance = await req.json();
      const ptsValidos = [1,2,5,10];
      if (!lance.membroId || !lance.mes || !lance.criterioId) return err('Dados incompletos');
      if (typeof lance.pts !== 'number' || !ptsValidos.includes(lance.pts)) return err('Pontuação inválida');
      const lancamentos = await store.get('lancamentos', { type: 'json' }) || [];
      const novoId = Date.now().toString();
      const novoTs = new Date().toISOString();
      const obs = String(lance.obs||'').trim().slice(0, 300);
      lancamentos.push({ membroId: String(lance.membroId), mes: String(lance.mes), criterioId: String(lance.criterioId), pts: Number(lance.pts), obs, id: novoId, ts: novoTs });
      await store.setJSON('lancamentos', lancamentos);
      return ok({ ok: true, id: novoId, ts: novoTs });
    }

    if (action === 'remover-lance' && req.method === 'POST') {
      const { id } = await req.json();
      if (!id || typeof id !== 'string') return err('ID obrigatório');
      let lancamentos = await store.get('lancamentos', { type: 'json' }) || [];
      lancamentos = lancamentos.filter(l => l.id !== id);
      await store.setJSON('lancamentos', lancamentos);
      return ok({ ok: true });
    }

    return err('Ação desconhecida');
  } catch(e) {
    return err('Erro interno: ' + e.message, 500);
  }
};
