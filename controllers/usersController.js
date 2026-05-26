// controllers/usersController.js
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

/**
 * GET /api/users
 * Solo TEACHER puede listar usuarios (sin contraseñas)
 */
export const getAllUsers = async (req, res) => {
  try {
    if (req.user.role !== 'TEACHER') {
      return res.status(403).json({ success: false, message: 'Solo disponible para docentes' });
    }

    const users = await prisma.user.findMany({
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
    });

    res.json({ success: true, data: users });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener usuarios', error: error.message });
  }
};

/**
 * GET /api/users/profile
 * Perfil del usuario autenticado
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true }
    });

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener perfil', error: error.message });
  }
};
