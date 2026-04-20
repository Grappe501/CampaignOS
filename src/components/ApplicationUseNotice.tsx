import { APPLICATION_USE_NOTICE } from '../brand/compliance'

export default function ApplicationUseNotice({
  variant = 'default',
}: {
  variant?: 'default' | 'compact'
}) {
  return (
    <p
      className={
        variant === 'compact'
          ? 'application-use-notice application-use-notice--compact'
          : 'application-use-notice'
      }
      role="note"
    >
      {APPLICATION_USE_NOTICE}
    </p>
  )
}
