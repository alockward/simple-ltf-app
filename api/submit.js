// /api/submit.js — Vercel Function: registra cada envío en un archivo CSV dentro de un repo de GitHub

export default async function handler(req, res) {
  // Configuración básica de CORS
  const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
  res.setHeader('Access-Control-Allow-Origin', allowedOrigin);
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }
  try {
    const p = req.body || {};
    // Campos obligatorios para un envío válido
    const required = ['name', 'email', 'phone', 'desc', 'category', 'subtype'];
    for (const key of required) {
      if (!p[key]) {
        return res.status(400).json({ error: `Falta ${key}` });
      }
    }
    // Preparar la fila CSV: escapar comillas y comas y unificar saltos de línea
    const now = new Date().toISOString();
    const cleanDesc = (p.desc || '')
      .replace(/\r?\n/g, ' ')
      .replace(/,/g, ' ');
    const fields = [
      p.id || '',
      now,
      p.category,
      p.subtype,
      p.name,
      p.email,
      p.phone,
      p.org || '',
      cleanDesc
    ].map(field => {
      const s = String(field);
      return `"${s.replace(/\"/g, '""')}"`;
    });
    const csvRow = fields.join(',');
    // Variables de entorno para GitHub
    const owner = process.env.GITHUB_OWNER;
    const repo = process.env.GITHUB_REPO;
    const filePath = process.env.GITHUB_FILE_PATH || 'submissions.csv';
    const token = process.env.GITHUB_TOKEN;
    if (!owner || !repo || !token) {
      return res.status(500).json({ error: 'Configuración de GitHub incompleta' });
    }
    const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    let existingContent;
    let sha;
    // Intentar obtener el archivo actual
    const existingRes = await fetch(apiUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json'
      }
    });
    if (existingRes.ok) {
      const data = await existingRes.json();
      sha = data.sha;
      const buf = Buffer.from(data.content, data.encoding);
      existingContent = buf.toString('utf8');
    } else if (existingRes.status === 404) {
      // Crear encabezado si el archivo no existe
      existingContent = 'id,timestamp,category,subtype,name,email,phone,org,desc';
      sha = undefined;
    } else {
      return res.status(502).json({ error: 'Error al leer archivo', details: await existingRes.text() });
    }
    // Unir el contenido existente con la nueva fila
    const newContent = `${existingContent}\n${csvRow}`;
    // Codificar a base64 para la API de GitHub
    const base64Content = Buffer.from(newContent).toString('base64');
    const commitMessage = `Add submission ${p.id || ''} at ${now}`;
    const updateBody = {
      message: commitMessage,
      content: base64Content,
      sha: sha || undefined
    };
    // Hacer PUT a la API de GitHub para crear/actualizar el archivo
    const updateRes = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/vnd.github+json'
      },
      body: JSON.stringify(updateBody)
    });
    if (!updateRes.ok) {
      return res.status(502).json({ error: 'Error al actualizar archivo', details: await updateRes.text() });
    }
    const updateJson = await updateRes.json();
    return res.status(200).json({ ok: true, commit: updateJson.commit && updateJson.commit.sha });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Error inesperado' });
  }
}