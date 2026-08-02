// 小程序 H5 等价验证用的 wx.cloud 垫片
//
// 小程序真机走 wx.cloud.callContainer（微信私有链路），浏览器里没有这个 API。
// 这里在页面脚本执行前注入一个同签名的实现，把请求转发到后端公网地址，
// 于是 request.js / 各页面里所有 callContainer 调用都无需改动源码即可跑通。
// 注意：这是纯测试期垫片，不进任何生产包。

/** 生成注入脚本文本（在浏览器上下文里执行） */
export function buildWxShim(apiRoot) {
  return `(() => {
  const API_ROOT = ${JSON.stringify(apiRoot.replace(/\/$/, ''))};

  function toQuery(data) {
    if (!data || typeof data !== 'object') return '';
    const parts = Object.entries(data)
      .filter(([, v]) => v !== undefined && v !== null)
      .map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
    return parts.length ? '?' + parts.join('&') : '';
  }

  function callContainer(opts) {
    const method = (opts.method || 'GET').toUpperCase();
    const isBodyless = method === 'GET' || method === 'HEAD';
    const url = API_ROOT + (opts.path || '') + (isBodyless ? toQuery(opts.data) : '');
    const headers = Object.assign({}, opts.header || {});
    // 小程序 request.js 在无令牌场景（如登录、未登录态）会带 "Authorization: Bearer "(空令牌)。
    // 后端对浏览器跨域公网链路会把这种空令牌判为无效并 401 拒绝登录；真实微信私有链路与 Node 直连则接受。
    // 这里把空令牌头剥掉，等价于「不带 Authorization」，使登录等公开接口正常 201。
    const authKey = Object.keys(headers).find((k) => k.toLowerCase() === 'authorization');
    if (authKey) {
      const v = String(headers[authKey]).trim();
      if (v === '' || /^Bearer\s*$/i.test(v) || /^Bearer\s+undefined$/i.test(v)) {
        delete headers[authKey];
      }
    }
    // X-WX-SERVICE 是私有链路路由头，公网直连不需要，留着也无害
    const controller = new AbortController();

    fetch(url, {
      method,
      headers,
      body: isBodyless ? undefined : JSON.stringify(opts.data || {}),
      signal: controller.signal,
    })
      .then(async (res) => {
        const text = await res.text();
        let data;
        try { data = text ? JSON.parse(text) : null; } catch (e) { data = text; }
        if (opts.success) opts.success({ statusCode: res.status, data, header: {} });
      })
      .catch((e) => {
        if (e && e.name === 'AbortError') return;
        if (opts.fail) opts.fail({ errMsg: String(e && e.message || e) });
      });

    // 返回 task 对象，兼容流式接口的 onChunkReceived / abort 调用
    return {
      onChunkReceived() {},
      offChunkReceived() {},
      abort() { controller.abort(); },
    };
  }

  const cloud = {
    init() {},
    callContainer,
  };

  // uni-app 的 H5 运行时在启动时会用自己的对象整个覆盖 window.wx，
  // 直接赋值会被冲掉。这里用取值器守住 wx：
  //   - cloud 始终是我们的实现（业务代码依赖它发请求）
  //   - uni 后续赋进来的对象挂到原型上，它自带的 wx API 仍可正常透传
  const base = { cloud };
  Object.defineProperty(window, 'wx', {
    configurable: true,
    enumerable: true,
    get() { return base; },
    set(v) {
      if (v && typeof v === 'object' && v !== base) {
        try { Object.setPrototypeOf(base, v); } catch (e) {}
      }
    },
  });
  window.__SMOKE_WX_SHIM__ = true;
})();`
}

/** 把垫片挂到 page 上（必须在任何页面脚本执行前调用） */
export async function installWxShim(page, apiRoot) {
  await page.evaluateOnNewDocument(buildWxShim(apiRoot))
}
