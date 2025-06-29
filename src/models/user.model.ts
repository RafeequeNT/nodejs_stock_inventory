export interface IUser extends Document {
  firstname?: string;
  lastname?: string;
  admin?: boolean;
}

export default IUser;
