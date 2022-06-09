import 'source-map-support/register';
import * as express from 'express';
import * as mongoose from 'mongoose';
import * as cors from 'cors';
import config from './config';
import successResponder from './lib/express-middleware/successResponder';
import errorResponder from './lib/express-middleware/errorResponder';
import initUserGroupService from './services/user-group';
import initPhotoEventService from './services/photo-event';
import initPhotoService from './services/photo';
import initAuthService from './services/auth';
import initFeedService from './services/feed';
import initExportService from './services/export';
import initAdminService from './services/admin';
import initMaintenanceService from './services/maintenance';
import { Redis } from './lib/redis';
import noContentResponder from './lib/express-middleware/noContentResponder';
import PhotoEventMonitor from './lib/photo-event-monitor';
import { PhotoProcessing } from './lib/photo-processing';

export const app = express();

const corsOptions: cors.CorsOptions = {
  origin: config.corsDomains,
  credentials: true,
  methods: 'GET, POST, OPTIONS, PUT, PATCH, DELETE, HEAD'
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(
  express.json({
    limit: '100mb'
  })
);
app.use(successResponder);
app.use(errorResponder);
app.use(noContentResponder);

async function startServer() {
  try {
    console.log(`Launching version ${process.env.GIT_COMMIT_SHA} of urbanbelonging-api`);

    await initUserGroupService(app);
    await initAuthService(app);
    await initPhotoEventService(app);
    await initPhotoService(app);
    await initFeedService(app);
    await initExportService(app);
    await initMaintenanceService(app);
    await initAdminService(app);

    await Redis.init();

    await mongoose.connect(config.mongoHost, {
      useNewUrlParser: true,
      useFindAndModify: false,
      useUnifiedTopology: true
    });

    await PhotoProcessing.init();

    const server = await app.listen(config.port);
    server.setTimeout(300000);

    new PhotoEventMonitor();

    console.info(`${app.name} listening on port ${config.port}`);
  } catch (err) {
    console.error(`Error Starting Application: ${err.message || ''}`, err);
    process.exit(1);
  }
}

startServer();
