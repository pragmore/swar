/* eslint no-new-func: 0 */
/* eslint-env browser */
const vars = {}
const subs = {}

const css = className => '__swar_' + className
const getValue = el => (el.type === "checkbox" ? el.checked : el.value)

const render = (template, item, index = 0) => {
  const matches = [...template.matchAll(/\{\{(.+?)\}\}/gm)]
  window.$item = item
  window.$index = index
  matches.forEach(match => {
    const val = Function('return (' + match[1] + ')')()
    template = template.replace(match[0], val)
  })
  return template
}
const renderVar = (val, el) => {
  el.innerHTML = render(el.dataset.template, val)
  el.hidden = false
}
const renderIf = el => { el.hidden = !Function('return  (' + el.dataset.if + ')')() }
const renderModel = (val, el) => {
  if (el.type === "checkbox") {
    el.checked = Boolean(val)
  } else {
    el.value = val
  }
}
const renderFor = (name, val, el) => {
  const parent = el.parentElement
  parent.querySelectorAll('.' + css('for')).forEach(el => el.remove())
  if (val && typeof val[Symbol.iterator] === 'function') {
    let sibling
    let index = 0
    for (const item of val) {
      sibling = el.cloneNode()
      sibling.hidden = false
      sibling.innerHTML = render(el.dataset.template, item, index)
      sibling.classList.add(css('for'))
      sibling.querySelectorAll('[data-onclick]').forEach(el => {
        el.dataset.onclick = el.dataset.onclick.replace('$index', index)
      })
      parent.append(sibling)
      index++
    }
  }
}

export const letVar = (name) => {
  const varName = '$' + name
  if (!window[varName]) {
    const obj = val => setVar(name, val)
    obj.fetch = (...params) => fetch.apply(this, params)
      .then(response => response.json())
      .then(data => setVar(name, data))
    obj.push = (...els) => {
      els.forEach(el => vars[name]?.push(el))
      setVar(name, vars[name])
      return vars[name].length
    }
    obj.pop = () => {
      const el = vars[name].pop()
      setVar(name, vars[name])
      return el
    }
    obj.splice = (start, deleteCount) => {
      const els = vars[name].splice(start, deleteCount)
      setVar(name, vars[name])
      return els
    }
    window[varName] = obj
  }
}

export const subscribe = (name, el) => {
  if (typeof subs[name] === 'undefined') {
    subs[name] = []
  }
  subs[name].push(el)
  letVar(name)
}

export const trigger = name => {
  if (typeof subs[name] === 'undefined') {
    return null
  }
  const val = vars[name]
  for (const el of subs[name]) {
    el.dataset.for && renderFor(name, val, el)
    el.dataset.var && renderVar(val, el)
    el.dataset.if && renderIf(el)
    el.dataset.model && renderModel(val, el)
  }
}

const setVar = (name, val) => {
  if (typeof val === 'undefined') {
    return vars[name] ?? null
  }
  vars[name] = val
  trigger(name)
  return val
}
export const setup = () => {
  const common = (name, el) => {
    el.dataset.template = el.innerHTML
    subscribe(name, el)
    el.hidden = true
    el.style.visibility = 'inherit'
    trigger(name)
  }
  document.querySelectorAll('[data-var]').forEach(el => {
    const name = el.dataset.var
    if (el.dataset.value) {
      setVar(name, JSON.parse(el.dataset.value))
    }
    common(name, el)
  })
  document.querySelectorAll('[data-for]').forEach(el => {
    common(el.dataset.for, el)
  })
  document.querySelectorAll('[data-if]').forEach(el => {
    const matches = new Set(el.dataset.if.matchAll(/\$([a-z0-9_]+)/gi))
    matches.forEach(matches => common(matches[1], el))
  })
  document.querySelectorAll('[data-model]').forEach(el => {
    const name = el.dataset.model
    el.addEventListener('input', ev => {
      console.log(getValue(el),el)
      setVar(name, getValue(el))
    })
    subscribe(name, el)
    setVar(name, getValue(el))
  })
  document.addEventListener('click', ev => {
    const el = ev.target
    if (el.dataset.onclick) {
      if (typeof el.dataset.prevent === 'undefined' || el.dataset.prevent === 'true') {
        ev.preventDefault()
      }
      Function(el.dataset.onclick).apply(el)
    }
  }, false)
  document.addEventListener('submit', ev => {
    const el = ev.target
    if (el.dataset.onsubmit) {
      if (typeof el.dataset.prevent === 'undefined' || el.dataset.prevent === 'true') {
        ev.preventDefault()
      }
      Function(el.dataset.onsubmit).apply(el)
    }
  }, false)
}

export { setup as default }
