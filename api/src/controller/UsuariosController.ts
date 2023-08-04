import { Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { Usuario } from "../entity/Usuario";
import { validate } from "class-validator";
import { errorMonitor } from "events";

class UsuariosController {
  static getAll = async (req: Request, resp: Response) => {
    try {
      const repoUsuario = AppDataSource.getRepository(Usuario);
      const listaUsuario = await repoUsuario.find({ where: { estado: true } });

      if (listaUsuario.length == 0) {
        return resp
          .status(404)
          .json({ mensaje: "No hay registros de usuarios." });
      }

      return resp.status(200).json(listaUsuario);
    } catch (error) {
      return resp
        .status(400)
        .json({ mensaje: "Error desconocido." });
    }
  };

  static getById = async (req: Request, resp: Response) => {
    try {
      const cedula = req.params["cedula"];

      if (!cedula) {
        return resp.status(404).json({ mensaje: "No se indica la cédula." });
      }

      const usuariosRepo = AppDataSource.getRepository(Usuario);

      let usuario;
      try {
        usuario = await usuariosRepo.findOneOrFail({
          where: { cedula, estado: true },
        });
      } catch (error) {
        return resp
          .status(404)
          .json({ mensaje: "No se encontro el usuario con esa cédula." });
      }

      return resp.status(200).json(usuario);
    } catch (error) {
      return resp.status(400).json({ mensaje: error });
    }
  };

  static add = async (req: Request, resp: Response) => {
    try {
      const { cedula, nombre, apellido1, apellido2, correo, rol, contrasena } =
        req.body;

      // typescript
      const fecha = new Date();

      let usuario = new Usuario();
      usuario.cedula = cedula;
      usuario.nombre = nombre;
      usuario.apellido1 = apellido1;
      usuario.apellido2 = apellido2;
      usuario.fecha_ingreso = fecha;
      usuario.correo = correo;
      usuario.contrasena = contrasena;
      usuario.rol = rol;
      usuario.estado = true;

      //validacion de datos de entrada
      const validateOpt = { validationError: { target: false, value: false } };
      const errores = await validate(usuario, validateOpt);

      if (errores.length != 0) {
        return resp.status(400).json(errores);
      }
      // reglas de negocio
      // valiando que el usuario o haya sido creado anteriormente
      const repoUsuario = AppDataSource.getRepository(Usuario);
      let usuarioExist = await repoUsuario.findOne({
        where: { cedula: cedula },
      });
      if (usuarioExist) {
        resp.status(400).json({ mensaje: "El usuario ya existe." });
      }

      // valiado que el correo no este registrado a algun usuario ya creado
      usuarioExist = await repoUsuario.findOne({ where: { correo: correo } });
      if (usuarioExist) {
        resp
          .status(400)
          .json({ mensaje: "Ya existe un usuario registrado con el correo." });
      }

      usuario.hashPassword();

      try {
        await repoUsuario.save(usuario);
        return resp.status(201).json({ mensaje: "Se ha creado el usuario." });
      } catch (error) {
        resp.status(400).json(error);
      }
    } catch (error) {
      resp.status(400).json({ mensaje: "Error desconocido." });
    }
  };

  static update = async (req: Request, resp: Response) => {
    const { cedula, nombre, apellido1, apellido2, correo, rol, contrasena } = req.body;

    //validacion de reglas de negocio
    const usuariosRepo = AppDataSource.getRepository(Usuario);
    let user: Usuario;
    try {
      user = await usuariosRepo.findOneOrFail({ where: { cedula } });
    } catch (error) {
      return resp.status(404).json({ mensaje: "No existe el usuario." });
    }

    user.cedula = cedula;
    user.nombre = nombre;
    user.apellido1 = apellido1;
    user.apellido2 = apellido2;
    user.correo = correo;
    user.rol = rol;
    user.contrasena = contrasena;

    //validar con class validator
    const errors = await validate(user, {
      validationError: { target: false, value: false },
    });

    if (errors.length > 0) {
      return resp.status(400).json(errors);
    }

    try {
      await usuariosRepo.save(user);
      return resp.status(200).json({ mensaje: "Se guardo correctamente" });
    } catch (error) {
      return resp.status(400).json({ mensaje: "No pudo guardar." });
    }
  };

  static delete = async (req: Request, resp: Response) => {
    try {
      const cedula = req.params["cedula"];
      if (!cedula) {
        return resp.status(404).json({ mensaje: "Debe indicar la cédula" });
      }

      const usuariosRepo = AppDataSource.getRepository(Usuario);
      let user: Usuario;
      try {
        user = await usuariosRepo.findOneOrFail({
          where: { cedula: cedula, estado: true },
        });
      } catch (error) {
        return resp
          .status(404)
          .json({ mensaje: "No se encuentra el usuario con esa cédula" });
      }

      user.estado = false;
      try {
        await usuariosRepo.save(user);
        return resp.status(200).json({ mensaje: "Se eliminó correctamente" });
      } catch (error) {
        return resp.status(400).json({ mensaje: "No se pudo eliminar." });
      }
    } catch (error) {
      return resp.status(400).json({ mensaje: "No se pudo eliminar" });
    }
  };
}

export default UsuariosController;
