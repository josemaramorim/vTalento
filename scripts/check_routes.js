const express = require('express');
const adminRoutes = require('../src/backend/api/routes/admin');
const app = express();
app.use('/api/admin', adminRoutes);
console.log('Express version', require('express/package.json').version);
console.log('app keys', Object.keys(app));
console.log('app properties', Object.getOwnPropertyNames(app).filter(name => name.startsWith('_')));
console.log('app._router', app._router);
console.log('app.router', app.router);
const routerStack = app._router ? app._router.stack : app.router.stack;
if (!routerStack) {
  console.error('No router stack found on app');
  process.exit(1);
}
function listRoutes(stack, prefix = '') {
  stack.forEach(layer => {
    if (layer.route) {
      const path = prefix + layer.route.path;
      const methods = Object.keys(layer.route.methods).join(',');
      console.log(methods.toUpperCase(), path);
    } else if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      let nextPrefix = prefix;
      const re = layer.regexp && layer.regexp.source;
      if (re && re !== '^\\/?$') {
        nextPrefix += re.replace('^\\/?', '').replace('\\/?$', '');
      }
      listRoutes(layer.handle.stack, nextPrefix);
    }
  });
}
listRoutes(routerStack);
