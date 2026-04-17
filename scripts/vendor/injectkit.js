var __defProp = Object.defineProperty;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

// dist/index.js
var DefaultMetadataRegistry = class {
  constructor() {
    __publicField(this, "serviceMetadata", /* @__PURE__ */ new WeakMap());
    __publicField(this, "decoratedClasses", /* @__PURE__ */ new Set());
  }
  defineServiceMetadata(target, metadata) {
    const current = this.serviceMetadata.get(target) ?? { injectable: false };
    const next = {
      ...current,
      ...metadata,
      deps: metadata.deps ? [...metadata.deps] : current.deps,
      injectable: metadata.injectable ?? current.injectable
    };
    this.serviceMetadata.set(target, next);
    this.decoratedClasses.add(target);
  }
  getServiceMetadata(target) {
    return this.serviceMetadata.get(target);
  }
  getDecoratedClasses() {
    return Array.from(this.decoratedClasses);
  }
  getConstructorDependencies(target, parents = []) {
    const metadata = this.getServiceMetadata(target);
    if (metadata?.deps) {
      if (metadata.deps.length < target.length) {
        throw new Error(`Service dependencies incomplete: ${[...parents, target.name].join(" -> ")}`);
      }
      return [...metadata.deps];
    }
    const baseClass = this.getBaseClass(target);
    if (baseClass === Array || baseClass === Map) {
      return [];
    }
    if (baseClass) {
      return this.getConstructorDependencies(baseClass, [...parents, target.name]);
    }
    if (target.length > 0) {
      throw new Error(`Service dependencies not declared: ${[...parents, target.name].join(" -> ")}`);
    }
    return [];
  }
  getBaseClass(target) {
    const baseClass = Object.getPrototypeOf(target.prototype).constructor;
    if (baseClass === Object) {
      return void 0;
    }
    return baseClass;
  }
};
var defaultMetadataRegistry = new DefaultMetadataRegistry();
var getDefaultMetadataRegistry = () => defaultMetadataRegistry;
var metadataRegistry = getDefaultMetadataRegistry();
var applyServiceMetadata = (metadata = {}) => (target) => {
  metadataRegistry.defineServiceMetadata(target, {
    ...metadata,
    deps: metadata.deps ? [...metadata.deps] : void 0,
    injectable: metadata.injectable ?? true
  });
  return target;
};
var Injectable = (options = {}) => applyServiceMetadata({ injectable: true, ...options });
var Singleton = (options = {}) => applyServiceMetadata({ injectable: true, lifetime: "singleton", ...options });
var Scoped = (options = {}) => applyServiceMetadata({ injectable: true, lifetime: "scoped", ...options });
var Transient = (options = {}) => applyServiceMetadata({ injectable: true, lifetime: "transient", ...options });
var Provider = (token, options = {}) => applyServiceMetadata({ injectable: true, provide: token, ...options });
var Container = class {
};
var formatToken = (token) => {
  if (typeof token === "string") {
    return token;
  }
  if (typeof token === "symbol") {
    return token.description ? `Symbol(${token.description})` : token.toString();
  }
  return token.name || "<anonymous>";
};
var InjectKitContainer = class _InjectKitContainer {
  constructor(registrations, parent) {
    __publicField(this, "instances", /* @__PURE__ */ new Map());
    this.registrations = registrations;
    this.parent = parent;
  }
  createInstance(token, registration) {
    let instance;
    if (registration.constructor) {
      const dependencies = [];
      for (const dependency of registration.ctorDependencies || []) {
        dependencies.push(this.get(dependency));
      }
      instance = new registration.constructor(...dependencies);
    } else if (registration.factory) {
      instance = registration.factory(this);
    } else if (registration.instance !== void 0) {
      instance = registration.instance;
    } else {
      throw new Error(`Invalid registration for ${formatToken(token)}`);
    }
    if (registration.collectionDependencies) {
      if (Array.isArray(registration.collectionDependencies) && instance instanceof Array) {
        for (const dependency of registration.collectionDependencies) {
          instance.push(this.get(dependency));
        }
      } else if (registration.collectionDependencies instanceof Map && instance instanceof Map) {
        for (const [key, dependency] of registration.collectionDependencies) {
          instance.set(key, this.get(dependency));
        }
      }
    }
    if (registration.lifetime === "singleton") {
      let container = this;
      while (container.parent) {
        container = container.parent;
      }
      container.instances.set(token, instance);
    } else if (registration.lifetime === "scoped") {
      this.instances.set(token, instance);
    }
    return instance;
  }
  getScopedInstance(token) {
    const instance = this.instances.get(token);
    if (!instance && this.parent) {
      return this.parent.getScopedInstance(token);
    }
    return instance;
  }
  get(token) {
    const registration = this.registrations.get(token);
    if (!registration) {
      throw new Error(`Registration for ${formatToken(token)} not found`);
    }
    if (registration.lifetime !== "transient") {
      const instance = this.getScopedInstance(token);
      if (instance) {
        return instance;
      }
    }
    return this.createInstance(token, registration);
  }
  hasRegistration(token) {
    return this.registrations.has(token);
  }
  createScopedContainer() {
    return new _InjectKitContainer(this.registrations, this);
  }
  override(token, instance) {
    this.registrations.set(token, {
      constructor: void 0,
      lifetime: "scoped",
      dependencies: [],
      ctorDependencies: [],
      factory: void 0,
      instance,
      collectionDependencies: void 0
    });
    this.instances.set(token, instance);
  }
};
var InjectKitRegistry = class _InjectKitRegistry {
  constructor(metadataRegistry2 = getDefaultMetadataRegistry()) {
    __publicField(this, "registrations", /* @__PURE__ */ new Map());
    this.metadataRegistry = metadataRegistry2;
  }
  register(token) {
    if (this.registrations.has(token)) {
      throw new Error(`Registration for ${formatToken(token)} already exists`);
    }
    const registration = new InjectKitRegistration(this.metadataRegistry);
    this.registrations.set(token, registration);
    return registration;
  }
  registerValue(token, value) {
    this.register(token).useInstance(value);
    return this;
  }
  registerFactory(token, factory, lifetime = "transient") {
    const registration = this.register(token).useFactory(factory);
    if (lifetime === "singleton") {
      registration.asSingleton();
    } else if (lifetime === "scoped") {
      registration.asScoped();
    } else {
      registration.asTransient();
    }
    return this;
  }
  remove(token) {
    if (!this.registrations.delete(token)) {
      throw new Error(`Registration for ${formatToken(token)} not found`);
    }
  }
  isRegistered(token) {
    return this.registrations.has(token);
  }
  static verifyRegistrations(registrations) {
    for (const [token, config] of registrations.entries()) {
      const missingDependencies = [];
      for (const dependency of config.dependencies) {
        if (!registrations.has(dependency)) {
          missingDependencies.push(formatToken(dependency));
        }
      }
      if (missingDependencies.length > 0) {
        throw new Error(
          `Missing dependencies for ${formatToken(token)}: ${missingDependencies.join(", ")}`
        );
      }
    }
  }
  static verifyNoCircularDependencies(registrations) {
    const checkCircularDependencies = (token, registration, dependencies) => {
      for (const dependency of registration.dependencies) {
        if (token === dependency) {
          throw new Error(
            `Circular dependency found: ${[
              formatToken(token),
              ...dependencies,
              formatToken(token)
            ].join(" -> ")}`
          );
        }
        const dependencyRegistration = registrations.get(dependency);
        if (dependencyRegistration && dependencyRegistration.dependencies.length > 0) {
          checkCircularDependencies(token, dependencyRegistration, [
            ...dependencies,
            formatToken(dependency)
          ]);
        }
      }
    };
    for (const [token, config] of registrations.entries()) {
      checkCircularDependencies(token, config, []);
    }
  }
  createRegistrationFromClass(token, constructor, lifetime) {
    const registration = new InjectKitRegistration(this.metadataRegistry);
    registration.useClass(constructor);
    if (lifetime === "singleton") {
      registration.asSingleton();
    } else if (lifetime === "scoped") {
      registration.asScoped();
    } else if (lifetime === "transient") {
      registration.asTransient();
    }
    return registration.build();
  }
  createRegistrationFromOverride(override) {
    if ("useValue" in override) {
      return {
        constructor: void 0,
        factory: void 0,
        instance: override.useValue,
        lifetime: "singleton",
        dependencies: [],
        ctorDependencies: [],
        collectionDependencies: void 0
      };
    }
    if ("useFactory" in override) {
      return {
        constructor: void 0,
        factory: override.useFactory,
        instance: void 0,
        lifetime: override.lifetime ?? "transient",
        dependencies: [],
        ctorDependencies: [],
        collectionDependencies: void 0
      };
    }
    return this.createRegistrationFromClass(
      override.token,
      override.useClass,
      override.lifetime
    );
  }
  applyDecoratedRegistrations(registrations) {
    for (const target of this.metadataRegistry.getDecoratedClasses()) {
      const metadata = this.metadataRegistry.getServiceMetadata(target);
      if (!metadata?.injectable) {
        continue;
      }
      const token = metadata.provide ?? target;
      if (registrations.has(token)) {
        continue;
      }
      registrations.set(
        token,
        this.createRegistrationFromClass(token, target, metadata.lifetime)
      );
    }
  }
  build(options = {}) {
    const registrations = /* @__PURE__ */ new Map();
    for (const [token, registration] of this.registrations.entries()) {
      registrations.set(token, registration.build());
    }
    if (options.autoRegisterDecorated) {
      this.applyDecoratedRegistrations(registrations);
    }
    if (!registrations.has(Container)) {
      registrations.set(Container, {
        lifetime: "singleton",
        dependencies: [],
        ctorDependencies: [],
        collectionDependencies: void 0,
        constructor: void 0,
        factory: (container) => container,
        instance: void 0
      });
    }
    for (const override of options.overrides ?? []) {
      registrations.set(override.token, this.createRegistrationFromOverride(override));
    }
    _InjectKitRegistry.verifyRegistrations(registrations);
    _InjectKitRegistry.verifyNoCircularDependencies(registrations);
    return new InjectKitContainer(registrations);
  }
};
var createRegistry = () => new InjectKitRegistry();
var InjectKitRegistration = class {
  constructor(metadataRegistry2) {
    __publicField(this, "ctor");
    __publicField(this, "factory");
    __publicField(this, "instance");
    __publicField(this, "collection");
    __publicField(this, "map");
    __publicField(this, "lifetime", "transient");
    __publicField(this, "lifetimeConfigured", false);
    this.metadataRegistry = metadataRegistry2;
  }
  useClass(constructor) {
    this.ctor = constructor;
    return this;
  }
  useFactory(factory) {
    this.factory = factory;
    return this;
  }
  useInstance(instance) {
    this.instance = instance;
    this.lifetime = "singleton";
    this.lifetimeConfigured = true;
  }
  useArray(constructor) {
    this.collection = [];
    this.ctor = constructor;
    return this;
  }
  useMap(constructor) {
    this.map = /* @__PURE__ */ new Map();
    this.ctor = constructor;
    return this;
  }
  asSingleton() {
    this.lifetime = "singleton";
    this.lifetimeConfigured = true;
  }
  asTransient() {
    this.lifetime = "transient";
    this.lifetimeConfigured = true;
  }
  asScoped() {
    this.lifetime = "scoped";
    this.lifetimeConfigured = true;
  }
  push(token) {
    this.collection.push(token);
    return this;
  }
  set(key, token) {
    this.map.set(key, token);
    return this;
  }
  build() {
    let ctorDependencies = [];
    if (this.ctor) {
      ctorDependencies = this.metadataRegistry.getConstructorDependencies(
        this.ctor
      );
    }
    const dependencies = [...ctorDependencies];
    if (this.collection) {
      dependencies.push(...this.collection);
    } else if (this.map) {
      dependencies.push(...Array.from(this.map.values()));
    }
    const lifetime = !this.lifetimeConfigured && this.ctor ? this.metadataRegistry.getServiceMetadata(
      this.ctor
    )?.lifetime ?? this.lifetime : this.lifetime;
    return {
      constructor: this.ctor,
      factory: this.factory,
      instance: this.instance,
      lifetime,
      dependencies,
      ctorDependencies,
      collectionDependencies: this.collection ?? this.map
    };
  }
};
export {
  Container,
  DefaultMetadataRegistry,
  InjectKitRegistry,
  Injectable,
  Provider,
  Scoped,
  Singleton,
  Transient,
  createRegistry,
  getDefaultMetadataRegistry
};
//# sourceMappingURL=injectkit.js.map