import mongoose from "mongoose";

const locationSchema = new mongoose.Schema(
  {
    country: { type: String, required: true },
    address: { type: String, required: true },
  },
  { _id: false }
);

const companySchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    location: locationSchema,
  },
  { _id: false }
);

const personSchema = new mongoose.Schema(
  {
    index: {
      type: Number,
      required: true,
      unique: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    registered: {
      type: Date,
      required: true,
    },

    age: {
      type: Number,
      min: 0,
      max: 120,
    },

    gender: {
      type: String,
      enum: ["male", "female", "other"],
    },

    eyeColor: {
      type: String,
      enum: ["blue", "green", "brown", "hazel", "black"],
    },

    favoriteFruit: {
      type: String,
      enum: ["apple", "banana", "orange", "pear", "strawberry", "mango"],
    },

    company: companySchema,

    tags: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

const Person = mongoose.model("Person", personSchema, "persons");

export default Person;
