export abstract class Database {
  protected models = new Map<string, any>()
  constructor() { /* ignored */ }
  public abstract async connect(config: any): Promise<any>
  public abstract instaniate(modelName: string, definition: any, target: any): void
  public getModel(modelName: string) {
    return this.models.get(modelName)
  }
}
