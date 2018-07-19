export interface IErrorResponse {
  status: number,
  message: string,
}

export const notFound = (message: string = "Not Found"): IErrorResponse => ({ status: 404, message })
