type Job = {
  id: string;
  data: any;
  handler: (data: any) => Promise<any>;
};

class SimpleQueue {
  private queue: Job[] = [];
  private processing = false;

  addJob(handler: (data: any) => Promise<any>, data: any) {
    const job: Job = {
      id: Date.now().toString(),
      data,
      handler,
    };

    this.queue.push(job);
    this.process();
  }

  private async process() {
    if (this.processing) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const job = this.queue.shift();
      if (!job) continue;

      try {
        await job.handler(job.data);
      } catch (err) {
        console.error(`Job failed → ${job.id}`, err);
      }
    }

    this.processing = false;
  }
}

export const simpleQueue = new SimpleQueue();
