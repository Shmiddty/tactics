import EventEmitter from 'events';

const testWildcard = /[\*\?]/;
const instances = new WeakMap();
const getPrivateData = instance => {
  if (instances.has(instance))
    return instances.get(instance);

  const wildTypes = new Map();
  const emitter = new EventEmitter()
    .on('removeListener', (eventType, fn) => {
      if (wildTypes.has(eventType) && emitter.listenerCount(eventType) === 0)
        wildTypes.delete(eventType);
    })
    .on('newListener', (eventType, fn) => {
      if (testWildcard.test(eventType) && !wildTypes.has(eventType))
        wildTypes.set(
          eventType,
          new RegExp('^' +
            eventType
              .replace(/([^\w\*\?])/g, '\\$1')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '\\w+') +
          '$'),
        );
    });

  const instanceData = { emitter, wildTypes };
  instances.set(instance, instanceData);
  return instanceData;
};

const props = {
  on: {
    value() {
      getPrivateData(this).emitter.on(...arguments);
      return this;
    },
  },
  once: {
    value() {
      getPrivateData(this).emitter.once(...arguments);
      return this;
    },
  },
  off: {
    value() {
      getPrivateData(this).emitter.off(...arguments);
      return this;
    },
  },

  _emit: {
    value(event) {
      const { emitter, wildTypes } = getPrivateData(this);
      emitter.emit(event.type, event);

      for (const [ eventType, matcher ] of wildTypes) {
        if (matcher.test(event.type))
          emitter.emit(eventType, event);
      }
    },
  },
};

export default constructor => Object.defineProperties(constructor.prototype, props);
