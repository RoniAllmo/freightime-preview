/** Local entry point: `npm start` from api/ (PORT defaults to 3000). */

import app from './index.js';

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`FreighTime API listening on http://localhost:${port}`);
});
