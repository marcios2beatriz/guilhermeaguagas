export default function TelefoneInput({ value, onChange, className, placeholder = 'Telefone' }) {
  function mascarar(v) {
    const nums = v.replace(/\D/g, '').slice(0, 11)
    if (nums.length <= 2) return nums
    if (nums.length <= 6) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
    if (nums.length <= 10) return `(${nums.slice(0, 2)}) ${nums.slice(2, 6)}-${nums.slice(6)}`
    return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
  }

  return (
    <input
      type="tel"
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(mascarar(e.target.value))}
      className={className}
      maxLength={16}
    />
  )
}
