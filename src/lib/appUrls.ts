export const MAIN_URL = process.env.NEXT_PUBLIC_MAIN_URL || 'http://localhost:8080'
export const OFFICE_URL = process.env.NEXT_PUBLIC_OFFICE_URL || 'http://localhost:8081'
export const COLLECTOR_URL = process.env.NEXT_PUBLIC_COLLECTOR_URL || 'http://localhost:8082'

export const AppUrls = {
  main: MAIN_URL,
  office: OFFICE_URL,
  collector: COLLECTOR_URL,
}

export default AppUrls


