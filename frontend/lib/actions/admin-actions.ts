"use server";

import { headers } from "next/headers";
import { auth } from "../auth";
import { getSession } from "../get-session";
import { forbidden, redirect, unauthorized } from "next/navigation";

/**
 * Helper function to check if the current user is an admin
 * Throws an error or redirects if not an admin
 */
async function requireAdmin() {
  const session = await getSession();
  
  if (!session?.user)unauthorized();
    
  // Check if user has admin role
  // By default, Better Auth admin plugin considers "admin" role as admin
  const userRole = session.user.role;
  if (userRole !== "admin") forbidden();
  return session;
}

/**
 * List all users with optional search, filter, and pagination (Admin only)
 */
export const listUsers = async (options?: {
  searchValue?: string;
  searchField?: "email" | "name";
  searchOperator?: "contains" | "starts_with" | "ends_with";
  limit?: string | number;
  offset?: string | number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
  filterField?: string;
  filterValue?: string | number | boolean;
  filterOperator?: "eq" | "ne" | "lt" | "lte" | "gt" | "gte" | "contains";
}) => {
  await requireAdmin();

  const result = await auth.api.listUsers({
    query: options || {},
    headers: await headers(),
  });

  return result;
};

/**
 * Create a new user (Admin only)
 * Use this to add users directly
 */
export const createUser = async (data: {
  email: string;
  password: string;
  name: string;
  role?: "admin" | "user" | ("admin" | "user")[];
  image?: string;
}) => {
  await requireAdmin();

  const result = await auth.api.createUser({
    body: {
      email: data.email,
      password: data.password,
      name: data.name,
      role: data.role,
      data: data.image ? { image: data.image } : undefined,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Invite a user via email (Admin only)
 * Creates a user with a temporary password and sends them an invite email
 * Note: You'll need to implement the email sending logic in your auth config
 */
export const inviteUser = async (data: {
  email: string;
  name: string;
  role?: "admin" | "user" | ("admin" | "user")[];
  inviteUrl?: string; // URL to redirect after accepting invite
}) => {
  await requireAdmin();

  // Generate a secure temporary password (user will need to reset it)
  const tempPassword = 
    Math.random().toString(36).slice(-12) + 
    Math.random().toString(36).slice(-12) + 
    "!@#";
  
  // Create the user
  const result = await auth.api.createUser({
    body: {
      email: data.email,
      password: tempPassword, // Temporary password - user should reset on first login
      name: data.name,
      role: data.role,
    },
    headers: await headers(),
  });

  // TODO: Send invite email with password reset link
  // You can trigger password reset email via auth.api.sendResetPassword
  // or implement custom email sending in your email service
  // The invite email should contain a link to reset password
  
  return result;
};

/**
 * Set user role (Admin only)
 */
export const setUserRole = async (data: {
  userId: string;
  role: "admin" | "user" | ("admin" | "user")[];
}) => {
  await requireAdmin();

  const result = await auth.api.setRole({
    body: {
      userId: data.userId,
      role: data.role,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Update user information including tags/custom fields (Admin only)
 */
export const updateUser = async (data: {
  userId: string;
  data: Record<string, any>; // Can include name, image, role, or custom fields
}) => {
  await requireAdmin();

  const result = await auth.api.adminUpdateUser({
    body: {
      userId: data.userId,
      data: data.data,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Hard delete a user (Admin only)
 */
export const deleteUser = async (data: { userId: string }) => {
  await requireAdmin();

  const result = await auth.api.removeUser({
    body: {
      userId: data.userId,
    },
    headers: await headers(),
  });

  return result;
};

/**
 * Helper function to check if current user is admin (non-throwing)
 * Use this in components to conditionally render admin UI
 */
export const isAdmin = async (): Promise<boolean> => {
  try {
    const session = await getSession();
    if (!session?.user) return false;

    const userRole = session.user.role;
    return userRole === "admin" || userRole?.includes("admin") || false;
  } catch {
    return false;
  }
};
