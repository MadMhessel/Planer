(function () {
  const script = document.currentScript;
  const widgetId = script && script.getAttribute('data-widget-id');
  const apiBase = new URL(script && script.src ? script.src : window.location.href).origin + '/api/v1';

  if (!widgetId) return;

  const root = document.createElement('div');
  root.style.position = 'fixed';
  root.style.right = '20px';
  root.style.bottom = '20px';
  root.style.zIndex = '2147483647';
  document.body.appendChild(root);

  const shadow = root.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      *{box-sizing:border-box;font-family:Inter,system-ui,sans-serif}
      .box{width:340px;max-width:calc(100vw - 32px);border:1px solid #e2e8f0;border-radius:14px;background:#fff;box-shadow:0 18px 50px rgba(15,23,42,.18);overflow:hidden}
      .head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:linear-gradient(135deg,#8b5cf6,#14b8a6);color:#fff;font-weight:700}
      .body{height:320px;overflow:auto;padding:12px;background:#f8fafc}
      .msg{margin:8px 0;padding:10px 12px;border-radius:12px;font-size:14px;line-height:1.4}
      .bot{background:#ede9fe;color:#1e293b;margin-right:36px}
      .user{background:#ccfbf1;color:#0f172a;margin-left:36px}
      form{display:flex;gap:8px;padding:12px;border-top:1px solid #e2e8f0}
      input{flex:1;border:1px solid #cbd5e1;border-radius:8px;padding:10px;font-size:14px}
      button{border:0;border-radius:8px;background:#8b5cf6;color:white;padding:10px 12px;font-weight:700;cursor:pointer}
      button:disabled{opacity:.6;cursor:not-allowed}
    </style>
    <div class="box">
      <div class="head"><span id="title">AI Ассистент</span><span>●</span></div>
      <div class="body" id="body"><div class="msg bot">Здравствуйте! Чем помочь?</div></div>
      <form id="form"><input id="input" placeholder="Введите сообщение..." /><button>Отправить</button></form>
    </div>
  `;

  const title = shadow.getElementById('title');
  const body = shadow.getElementById('body');
  const form = shadow.getElementById('form');
  const input = shadow.getElementById('input');
  let conversationId = null;

  const add = (text, cls) => {
    const item = document.createElement('div');
    item.className = `msg ${cls}`;
    item.textContent = text;
    body.appendChild(item);
    body.scrollTop = body.scrollHeight;
  };

  fetch(`${apiBase}/public/widget/${encodeURIComponent(widgetId)}/config`)
    .then((r) => r.json())
    .then((config) => {
      if (config.assistant_name) title.textContent = config.assistant_name;
      if (config.welcome_text) body.firstElementChild.textContent = config.welcome_text;
    })
    .catch(() => undefined);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const text = input.value.trim();
    if (!text) return;
    input.value = '';
    add(text, 'user');
    const button = form.querySelector('button');
    button.disabled = true;
    try {
      const response = await fetch(`${apiBase}/public/widget/${encodeURIComponent(widgetId)}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          conversation_id: conversationId,
          user_external_id: 'widget-user',
          channel_type: 'web',
        }),
      });
      const payload = await response.json();
      conversationId = payload.conversation && payload.conversation.id;
      add(payload.assistant_message ? payload.assistant_message.content : 'Не удалось получить ответ.', 'bot');
    } catch {
      add('Сервис временно недоступен. Попробуйте позже.', 'bot');
    } finally {
      button.disabled = false;
    }
  });
})();
