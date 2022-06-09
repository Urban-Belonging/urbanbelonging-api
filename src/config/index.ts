import LocalConfig from './local';
import ProductionConfig from './production';

const env = process.env.NODE_ENV || 'local';

const configMap = new Map<string, Config>([
  ['local', LocalConfig],
  ['production', ProductionConfig]
]);

if (!configMap.has(env)) {
  throw new Error(`No config found for NODE_ENV: ${env}`);
} else {
  console.log(`Config loaded for environment ${env}`);
}

const config = configMap.get(env) as Config;

export default config;
