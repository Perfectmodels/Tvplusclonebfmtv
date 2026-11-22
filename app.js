'use strict';

/**
 * Point d'entree Passenger pour l'hebergement mutualise LWS cPanel.
 *
 * Dans "Setup Node.js App", definir "Application startup file" sur app.js.
 * Compiler l'application avec "npm run build" AVANT le redemarrage.
 * Passenger pilote le processus et intercepte server.listen().
 */
const http = require('node:http');
const next = require('next');

const app = next({ dev: false, dir: __dirname });
const handle = app.getRequestHandler();

app.prepare()
  .then(() => {
    const server = http.createServer((req, res) => {
      Promise.resolve(handle(req, res)).catch((error) => {
        console.error('[LWS] Erreur pendant la requete :', error);
        if (!res.headersSent) {
          res.statusCode = 500;
          res.end('Internal Server Error');
        } else {
          res.destroy(error);
        }
      });
    });

    server.listen(process.env.PORT || 3000, () => {
      console.log('[LWS] Next.js est pret (Passenger / production).');
    });
  })
  .catch((error) => {
    console.error('[LWS] Echec de demarrage Next.js :', error);
    process.exit(1);
  });
