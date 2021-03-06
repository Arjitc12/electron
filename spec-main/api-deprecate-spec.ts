import { expect } from 'chai'
import { deprecate } from 'electron'

describe('deprecate', () => {
  beforeEach(() => {
    deprecate.setHandler(null)
    process.throwDeprecation = true
  })

  it('allows a deprecation handler function to be specified', () => {
    const messages: string[] = []

    deprecate.setHandler(message => {
      messages.push(message)
    })

    deprecate.log('this is deprecated')
    expect(messages).to.deep.equal(['this is deprecated'])
  })

  it('returns a deprecation handler after one is set', () => {
    const messages = []

    deprecate.setHandler(message => {
      messages.push(message)
    })

    deprecate.log('this is deprecated')
    expect(deprecate.getHandler()).to.be.a('function')
  })

  it('renames a property', () => {
    let msg
    deprecate.setHandler(m => { msg = m })

    const oldProp = 'dingyOldName'
    const newProp = 'shinyNewName'

    let value = 0
    const o: Record<string, number> = { [newProp]: value }
    expect(o).to.not.have.property(oldProp)
    expect(o).to.have.property(newProp).that.is.a('number')

    deprecate.renameProperty(o, oldProp, newProp)
    o[oldProp] = ++value

    expect(msg).to.be.a('string')
    expect(msg).to.include(oldProp)
    expect(msg).to.include(newProp)

    expect(o).to.have.property(newProp).that.is.equal(value)
    expect(o).to.have.property(oldProp).that.is.equal(value)
  })

  it('doesn\'t deprecate a property not on an object', () => {
    const o: any = {}

    expect(() => {
      deprecate.removeProperty(o, 'iDoNotExist')
    }).to.throw(/iDoNotExist/)
  })

  it('deprecates a property of an object', () => {
    let msg
    deprecate.setHandler(m => { msg = m })

    const prop = 'itMustGo'
    const o = { [prop]: 0 }

    deprecate.removeProperty(o, prop)

    const temp = o[prop]

    expect(temp).to.equal(0)
    expect(msg).to.be.a('string')
    expect(msg).to.include(prop)
  })

  it('warns exactly once when a function is deprecated with no replacement', () => {
    let msg
    deprecate.setHandler(m => { msg = m })

    function oldFn () { return 'hello' }
    const deprecatedFn = deprecate.removeFunction(oldFn, 'oldFn')
    deprecatedFn()

    expect(msg).to.be.a('string')
    expect(msg).to.include('oldFn')
  })

  it('warns exactly once when a function is deprecated with a replacement', () => {
    let msg
    deprecate.setHandler(m => { msg = m })

    function oldFn () { return 'hello' }
    function newFn () { return 'goodbye' }
    const deprecatedFn = deprecate.renameFunction(oldFn, newFn)
    deprecatedFn()

    expect(msg).to.be.a('string')
    expect(msg).to.include('oldFn')
    expect(msg).to.include('newFn')
  })

  it('warns only once per item', () => {
    const messages: string[] = []
    deprecate.setHandler(message => messages.push(message))

    const key = 'foo'
    const val = 'bar'
    const o = { [key]: val }
    deprecate.removeProperty(o, key)

    for (let i = 0; i < 3; ++i) {
      expect(o[key]).to.equal(val)
      expect(messages).to.have.length(1)
    }
  })

  it('warns if deprecated property is already set', () => {
    let msg
    deprecate.setHandler(m => { msg = m })

    const oldProp = 'dingyOldName'
    const newProp = 'shinyNewName'

    const o: Record<string, number> = { [oldProp]: 0 }
    deprecate.renameProperty(o, oldProp, newProp)

    expect(msg).to.be.a('string')
    expect(msg).to.include(oldProp)
    expect(msg).to.include(newProp)
  })

  it('throws an exception if no deprecation handler is specified', () => {
    expect(() => {
      deprecate.log('this is deprecated')
    }).to.throw(/this is deprecated/)
  })

  it('warns when a function is deprecated in favor of a property', () => {
    const warnings: string[] = []
    deprecate.setHandler(warning => warnings.push(warning))

    const newProp = 'newProp'
    const mod: any = {
      _oldGetterFn () { return 'getter' },
      _oldSetterFn () { return 'setter' }
    }

    deprecate.fnToProperty(mod, 'newProp', '_oldGetterFn', '_oldSetterFn')

    mod['oldGetterFn']()
    mod['oldSetterFn']()

    expect(warnings).to.have.lengthOf(2)

    expect(warnings[0]).to.include('oldGetterFn')
    expect(warnings[0]).to.include(newProp)

    expect(warnings[1]).to.include('oldSetterFn')
    expect(warnings[1]).to.include(newProp)
  })

  describe('moveAPI', () => {
    beforeEach(() => {
      deprecate.setHandler(null)
    })

    it('should call the original method', () => {
      const warnings = []
      deprecate.setHandler(warning => warnings.push(warning))

      let called = false
      const fn = () => {
        called = true
      }
      const deprecated = deprecate.moveAPI(fn, 'old', 'new')
      deprecated()
      expect(called).to.equal(true)
    })

    it('should log the deprecation warning once', () => {
      const warnings: string[] = []
      deprecate.setHandler(warning => warnings.push(warning))

      const deprecated = deprecate.moveAPI(() => null, 'old', 'new')
      deprecated()
      expect(warnings).to.have.lengthOf(1)
      deprecated()
      expect(warnings).to.have.lengthOf(1)
      expect(warnings[0]).to.equal('\'old\' is deprecated and will be removed. Please use \'new\' instead.')
    })
  })

  describe('promisify', () => {
    const expected = 'Hello, world!'
    let promiseFunc: (param: any) => Promise<any>
    let warnings: string[]

    const enableCallbackWarnings = () => {
      warnings = []
      deprecate.setHandler(warning => warnings.push(warning))
      process.enablePromiseAPIs = true
    }

    beforeEach(() => {
      deprecate.setHandler(null)
      process.throwDeprecation = true

      promiseFunc = param => new Promise((resolve, reject) => resolve(param))
    })

    it('acts as a pass-through for promise-based invocations', async () => {
      enableCallbackWarnings()
      promiseFunc = deprecate.promisify(promiseFunc)

      const actual = await promiseFunc(expected)
      expect(actual).to.equal(expected)
      expect(warnings).to.have.lengthOf(0)
    })

    it('only calls back an error if the callback is called with (err, data)', async () => {
      enableCallbackWarnings()
      const erringPromiseFunc = deprecate.promisify(
        () => new Promise((resolve, reject) => {
          reject(new Error('fail'))
        })
      )

      {
        const [err, data] = await new Promise(resolve => {
          (erringPromiseFunc as any)((err: Error | undefined, data: any) => {
            resolve([err, data])
          }).catch(() => { /* silence deprecation warning */ })
        });
        expect(data).to.be.undefined()
        expect(err).to.be.an.instanceOf(Error).with.property('message', 'fail')
      }
      {
        const data = await new Promise(resolve => {
          (erringPromiseFunc as any)(((data: any) => { resolve(data) }))
            .catch(() => { /* silence deprecation warning */ })
        })
        expect(data).to.be.undefined()
      }
    })

    it('warns exactly once for callback-based invocations', (done) => {
      enableCallbackWarnings()
      promiseFunc = deprecate.promisify(promiseFunc)

      let callbackCount = 0
      const invocationCount = 3
      const callback = (actual: number) => {
        expect(actual).to.equal(expected)
        expect(warnings).to.have.lengthOf(1)
        expect(warnings[0]).to.include('promiseFunc')
        callbackCount += 1
        if (callbackCount === invocationCount) {
          done()
        }
      }

      for (let i = 0; i < invocationCount; i += 1) {
        (promiseFunc as any)(expected, callback)
      }
    })
  })
})
