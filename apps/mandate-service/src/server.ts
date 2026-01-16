import { createApp } from './app';
import { config } from './config/env';

const app = createApp();
const PORT = config.port;

app.listen(PORT, () => {
  console.log(`🚀 Mandate Service running on port ${PORT}`);
  console.log(`📡 Environment: ${config.nodeEnv}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/health`);
});
