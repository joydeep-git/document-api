import argon2 from 'argon2';
import db from "./db-client.js";
import { UserDataType } from '../types/auth.js';
import { errRouter } from '../errors/error-responder.js';


const authQueries = {


  async findUser({ value, type = "email", getPassword = false }: {
    value: string;
    type: "email" | "id";
    getPassword?: boolean;
  }): Promise<UserDataType | null> {

    try {

      const user = await db.user.findFirst({
        where: { [type]: value },
        omit: { password: !getPassword },
      });

      return user as UserDataType | null;

    } catch (err) {
      throw errRouter(err);
    }
  },


  async createUser({ name, email, password }: {
    name: string;
    email: string;
    password: string;
  }): Promise<UserDataType> {

    try {

      const hashedPassword = await argon2.hash(password);

      const user = await db.user.create({
        data: { name, email, password: hashedPassword },
        omit: { password: true },
      });

      return user as UserDataType;

    } catch (err) {
      throw errRouter(err);
    }

  },


  async verifyPassword({ email, plainPassword }: {
    email: string;
    plainPassword: string;
  }): Promise<UserDataType | null> {

    try {

      const user = await db.user.findUnique({
        where: { email },
      });

      if (!user) return null;

      const valid = await argon2.verify(user.password, plainPassword);

      if (!valid) return null;

      const { password: _pwd, ...safeUser } = user;

      return safeUser as UserDataType;

    } catch (err) {
      throw errRouter(err);
    }

  },

}


export default authQueries;