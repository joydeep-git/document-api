import { Request } from "express";


export const fieldValidator = (fields: string[], req: Request): string | null => {

  for (const field of fields) {

    const value = req.body[field] || null;

    if (value === undefined || value === null || String(value).trim() === "") {
      return field;
    }

  }

  return null;

}


export const isValidEmail = (email: string): boolean => {

  const re: RegExp = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i;

  return re.test(email);

}