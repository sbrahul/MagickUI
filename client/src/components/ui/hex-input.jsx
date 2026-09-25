import { useState } from 'react'

// Sends only complete #rrggbb values; hexToMagickColor turns a partial one like "#ff" into NaN channels.
export function HexInput({ value, onChange, ...props }) {
  const [text, setText] = useState(value)
  const [prevValue, setPrevValue] = useState(value)
  if (value !== prevValue) {
    setPrevValue(value)
    setText(value)
  }

  function handleChange(e) {
    const next = e.target.value
    if (!/^#[0-9a-fA-F]{0,6}$/.test(next)) return
    setText(next)
    if (next.length === 7) onChange(next)
  }

  return <input type="text" value={text} onChange={handleChange} {...props} />
}
