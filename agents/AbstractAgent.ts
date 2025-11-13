// agents/AbstractAgent.ts
// Base abstract agent class following AG-UI protocol

export interface AgentEvent {
  type: string;
  runId: string;
  timestamp: number;
  data?: any;
}

export interface AgentRun {
  runId: string;
  status: 'running' | 'completed' | 'failed';
  startTime: number;
  endTime?: number;
  result?: any;
  error?: string;
}

export interface AgentTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
}

export abstract class AbstractAgent {
  protected runId: string;
  protected status: 'idle' | 'running' | 'completed' | 'failed';
  protected startTime: number;
  protected endTime?: number;
  protected result?: any;
  protected error?: string;

  constructor() {
    this.runId = this.generateRunId();
    this.status = 'idle';
    this.startTime = 0;
  }

  protected generateRunId(): string {
    return `run_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  protected createEvent(type: string, data?: any): AgentEvent {
    return {
      type,
      runId: this.runId,
      timestamp: Date.now(),
      data
    };
  }

  protected async emitEvent(event: AgentEvent): Promise<void> {
    // Override in subclasses to handle event emission
    console.log(`[Agent ${this.constructor.name}] Event:`, event);
  }

  protected async emitRunStarted(): Promise<void> {
    this.status = 'running';
    this.startTime = Date.now();
    await this.emitEvent(this.createEvent('run_started', {
      runId: this.runId,
      startTime: this.startTime
    }));
  }

  protected async emitRunFinished(result?: any): Promise<void> {
    this.status = 'completed';
    this.endTime = Date.now();
    this.result = result;
    await this.emitEvent(this.createEvent('run_finished', {
      runId: this.runId,
      result,
      duration: this.endTime - this.startTime
    }));
  }

  protected async emitRunError(error: string): Promise<void> {
    this.status = 'failed';
    this.endTime = Date.now();
    this.error = error;
    await this.emitEvent(this.createEvent('run_error', {
      runId: this.runId,
      error,
      duration: this.endTime - this.startTime
    }));
  }

  protected async emitProgress(progress: number, message?: string): Promise<void> {
    await this.emitEvent(this.createEvent('progress', {
      progress,
      message
    }));
  }

  protected async emitContentChunk(chunk: string, chunkIndex: number): Promise<void> {
    await this.emitEvent(this.createEvent('content_chunk', {
      chunk,
      chunkIndex,
      isLast: false
    }));
  }

  protected async emitContentEnd(): Promise<void> {
    await this.emitEvent(this.createEvent('content_end', {
      runId: this.runId
    }));
  }

  protected async emitToolCall(toolName: string, arguments_: any): Promise<void> {
    await this.emitEvent(this.createEvent('tool_call', {
      toolName,
      arguments: arguments_
    }));
  }

  protected async emitToolResult(toolName: string, result: any): Promise<void> {
    await this.emitEvent(this.createEvent('tool_result', {
      toolName,
      result
    }));
  }

  abstract execute(input: any): Promise<any>;

  getRunId(): string {
    return this.runId;
  }

  getStatus(): string {
    return this.status;
  }

  getResult(): any {
    return this.result;
  }

  getError(): string | undefined {
    return this.error;
  }
}
