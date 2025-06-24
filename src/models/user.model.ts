// import mongoose, { Document, Schema } from "mongoose";
// import passportLocalMongoose from "passport-local-mongoose";

// 1. Define an interface for User document (extends passport-local's User)
export interface IUser extends Document {
  firstname?: string;
  lastname?: string;
  admin?: boolean;
}

// 2. Create schema
// const UserSchema = new Schema<IUser>({
//   firstname: {
//     type: String,
//     default: "",
//   },
//   lastname: {
//     type: String,
//     default: "",
//   },
//   admin: {
//     type: Boolean,
//     default: false,
//   },
// });

// 3. Add passport-local-mongoose plugin (adds username, hash, salt, etc.)
// UserSchema.plugin(passportLocalMongoose);

// 4. Export the model
// const User = mongoose.model<IUser>("User", UserSchema);
export default IUser;
