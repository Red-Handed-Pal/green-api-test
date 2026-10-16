type AvatarProps = {
  name: string
}

const AVATAR_COLORS = ['#e8863a', '#c4478c', '#6c5ce7', '#2f9e8f', '#d6584f']

const colorFor = (name: string) => {
  const sum = [...name].reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return AVATAR_COLORS[sum % AVATAR_COLORS.length]
}

export const Avatar = ({ name }: AvatarProps) => {
  const letter = name.replace(/^\+/, '').trim().charAt(0).toUpperCase() || '?'
  return (
    <span className="avatar" style={{ background: colorFor(name) }}>
      {letter}
    </span>
  )
}
