export interface CurrentUser {
  id: string; // ID del usuario
  email: string; // Email del usuario
  role: string[]; // role del usuario ['admin', 'user']
  firstName: string; // Nombre del usuario
  lastName: string; // Apellido del usuario
  cedula: string; // Cedula del usuario
  phone: string; // Telefono del usuario
}
