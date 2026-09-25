import { useState } from 'react'

// Keeps its own text so partial input like "-" or "" is not replaced by the last number.
export function NumberInput({ value, onChange, ...props }) {
  const [text, setText] = useState(String(value))
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setText(String(value))
  }

  function handleChange(e) {
    const next = e.target.value
    setText(next)
    const n = Number(next)
    if (next.trim() !== '' && Number.isFinite(n)) onChange(n)
  }

  return <input type="number" value={text} onChange={handleChange} {...props} />
}
