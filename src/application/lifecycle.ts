export type Subscription = { remove(): void | Promise<void> };
export type LifecyclePorts = {
  visibility(listener: () => void): () => void;
  keys(listener: (event: KeyboardEvent) => void): () => void;
  back(listener: () => void): Promise<Subscription>;
  open(listener: (event: { open: string; at: number }) => void): Promise<Subscription>;
  money(listener: () => void): Promise<Subscription>;
};
export type LifecycleActions = {
  visible(): void; key(event: KeyboardEvent): void; back(): void;
  open(event: { open: string; at: number }): void; money(): void;
};

/** Remove web and native listeners, including registrations that finish after disposal. */
export class AppLifecycle {
  private phase: "new" | "started" | "disposed" = "new";
  private removals: (() => void | Promise<void>)[] = [];
  private ports: LifecyclePorts;
  constructor(ports: LifecyclePorts) { this.ports = ports; }
  start(actions: LifecycleActions) {
    if (this.phase !== "new") return;
    this.phase = "started";
    const guard = <T>(callback: (value: T) => void) => (value: T) => { if (this.phase === "started") callback(value); };
    this.removals.push(this.ports.visibility(() => { if (this.phase === "started") actions.visible(); }), this.ports.keys(guard(actions.key)));
    const registered = (handle: Promise<Subscription>) => {
      void handle.then(handle => {
        if (this.phase === "disposed") return handle.remove();
        this.removals.push(() => handle.remove());
      }).catch(error => console.warn("[thaili] device listener unavailable", error));
    };
    registered(this.ports.back(() => { if (this.phase === "started") actions.back(); }));
    registered(this.ports.open(guard(actions.open)));
    registered(this.ports.money(() => { if (this.phase === "started") actions.money(); }));
  }
  dispose() {
    if (this.phase === "disposed") return;
    this.phase = "disposed";
    this.removals.splice(0).forEach(remove => {
      try { void Promise.resolve(remove()).catch(console.warn); } catch (error) { console.warn(error); }
    });
  }
}
