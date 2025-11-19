import { Logger } from '@nestjs/common';
import cluster from 'cluster';
import os from 'os';
import { bootstrap } from './main';

if (cluster.isPrimary) {
  const numCPUs = os.cpus().length;

  Logger.log(`🚀 Master process is running. Forking ${numCPUs} workers...`);

  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }

  // Khi worker chết → restart
  cluster.on('exit', (worker) => {
    Logger.warn(`Worker ${worker.process.pid} died ❌. Restarting...`);
    cluster.fork();
  });
} else {
  bootstrap();
  Logger.log(`Worker ${process.pid} started ✔`);
}
