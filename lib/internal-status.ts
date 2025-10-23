// In-memory storage for internal status updates
export interface InternalStatusUpdate {
  organization: 'prodgain' | 'mordor';
  status: 'operational' | 'degraded_performance' | 'partial_outage' | 'major_outage' | 'under_maintenance';
  message: string;
  timestamp: string;
  updatedBy?: string;
}

class InternalStatusStore {
  private static instance: InternalStatusStore;
  private statuses: Map<string, InternalStatusUpdate> = new Map();

  private constructor() {
    // Initialize with default operational status
    this.statuses.set('prodgain', {
      organization: 'prodgain',
      status: 'operational',
      message: 'Research orchestration systems',
      timestamp: new Date().toISOString()
    });
    this.statuses.set('mordor', {
      organization: 'mordor',
      status: 'operational',
      message: 'Data pipeline and analysis infrastructure',
      timestamp: new Date().toISOString()
    });
  }

  public static getInstance(): InternalStatusStore {
    if (!InternalStatusStore.instance) {
      InternalStatusStore.instance = new InternalStatusStore();
    }
    return InternalStatusStore.instance;
  }

  public getStatus(org: 'prodgain' | 'mordor'): InternalStatusUpdate | undefined {
    return this.statuses.get(org);
  }

  public getAllStatuses(): InternalStatusUpdate[] {
    return Array.from(this.statuses.values());
  }

  public updateStatus(update: InternalStatusUpdate): void {
    this.statuses.set(update.organization, {
      ...update,
      timestamp: new Date().toISOString()
    });
  }
}

export default InternalStatusStore;
