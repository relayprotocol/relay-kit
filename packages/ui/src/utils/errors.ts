export function errorToJSON(error: any) {
  if (!(error instanceof Error)) {
    return error
  }
  try {
    return JSON.stringify({
      //@ts-expect-error
      name: error.name,
      //@ts-expect-error
      message: error.message,
      stack: error.stack,
      ...error
    })
  } catch (e) {
    return error
  }
}

export function JSONToError<T>(json?: T): Error | T | undefined {
  if (!json || typeof json !== 'string') {
    return json
  }

  try {
    const parsed = JSON.parse(json)
    const error = new Error(parsed.message)
    error.name = parsed.name
    error.stack = parsed.stack
    // Restore any additional properties from the original error
    Object.assign(error, parsed)
    return error
  } catch (e) {
    return json
  }
}
