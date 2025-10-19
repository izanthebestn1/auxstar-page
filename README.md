# Auxstar Media - Multi-Page News Platform

Un sitio web profesional de noticias y medios con autenticación de usuarios, panel de administrador y gestión de artículos.

## 🎯 Características

### Páginas Públicas
- **Home (index.html)** - Portada con noticias destacadas y recientes
- **Articles (articles.html)** - Galería filtrable de artículos
- **Railroads (railroads.html)** - Sección dedicada a contenido de Railroads
- **Evidence (evidence.html)** - Formulario para enviar evidencia a la comunidad

### Panel de Administrador
- **Login (admin/login.html)** - Autenticación segura
- **Dashboard (admin/dashboard.html)** - Panel de control con:
  - Estadísticas generales
  - Gestión de artículos (aprobar/rechazar)
  - Publicación directa de artículos
  - Gestión de evidencia enviada
  - Gestión de usuarios/contributores

## 🔐 Autenticación

### Usuarios de Prueba
```
Rol: Admin
Username: admin
Password: admin123

Rol: Editor
Username: editor1
Password: editor123
```

### Permisos
- **Admin**: Puede hacer todo (acceder a dashboard, publicar artículos, gestionar usuarios)
- **Editor**: Puede ver artículos y enviar evidencia (sin acceso a admin)
- **Usuario**: Puede ver contenido y enviar evidencia

## 📁 Estructura de Archivos

```
auxstar-page/
├── index.html                 # Página de inicio
├── articles.html             # Página de artículos
├── railroads.html            # Sección Railroads
├── evidence.html             # Envío de evidencia
├── styles.css                # Estilos principales
├── script.js                 # Utilidades compartidas
│
├── admin/
│   ├── login.html            # Login del admin
│   └── dashboard.html        # Panel de administrador
│
├── css/
│   └── admin.css             # Estilos del admin
│
└── js/
    ├── auth.js               # Sistema de autenticación
    ├── home.js               # Lógica de inicio
    ├── articles.js           # Lógica de artículos
    ├── railroads.js          # Lógica de Railroads
    ├── evidence.js           # Lógica de evidencia
    ├── login.js              # Lógica de login
    └── dashboard.js          # Lógica del dashboard
```

## 🚀 Cómo Usar

### 1. Abrir la Página
Simplemente abre `index.html` en tu navegador

### 2. Acceder al Admin
- Haz clic en "Admin" en la navegación
- Usa las credenciales de prueba (usuario: admin, contraseña: admin123)
- Accederás al dashboard

### 3. Publicar Artículos (Admin)
- En el dashboard, ve a "Submit Article"
- Completa el formulario y haz clic en "Publish Article"
- Los artículos se publican automáticamente para admins

### 4. Gestionar Artículos (Admin)
- En "Articles", verás todos los artículos pendientes
- Puedes aprobarlos o rechazarlos
- Los artículos aprobados aparecen en la página pública

### 5. Enviar Evidencia (Público)
- Ve a la página "Evidence"
- Completa el formulario y envía
- Los administradores pueden ver la evidencia en el dashboard

## 💾 Almacenamiento

Toda la información se guarda en **localStorage** del navegador:
- `auxstarArticles` - Artículos publicados
- `auxstarEvidence` - Evidencia enviada
- `auxstarUsers` - Base de usuarios
- `auxstarUser` (sessionStorage) - Usuario actualmente logueado

## 🎨 Diseño

- **Encabezado rojo** con logo de Auxstar Media
- **Colores principales**: Rojo (#E74C3C), Blanco, Gris
- **Diseño responsivo** - Funciona en móvil, tablet y desktop
- **Sin tema oscuro** - Diseño limpio y moderno

## 📊 Funcionalidades por Sección

### Home
- Artículos destacados (últimos 3 aprobados)
- Últimas noticias (últimos 5 artículos)
- Botones de navegación rápida
- Información sobre la plataforma

### Articles
- Filtro por categoría (All, News, Updates, Evidence)
- Galería de artículos con imágenes
- Información del artículo (autor, fecha)
- Responsive grid

### Railroads
- Zona dedicada y separada
- Mismo diseño de galería
- Contenido filtrado solo para Railroads

### Evidence
- Formulario para enviar evidencia
- Campos: Título, descripción, archivo, nombre, email
- Lista de evidencia enviada
- Notificaciones de estado

### Admin Dashboard
- Estadísticas en tiempo real
- Gestión completa de artículos
- Publicación rápida de artículos
- Revisión de evidencia
- Gestión de usuarios (solo admin)

## 🔄 Flujo de Trabajo

1. **Usuario publico** → Ve contenido aprobado en páginas públicas
2. **Editor** → Puede enviar evidencia
3. **Admin** → Revisa evidencia, publica artículos, gestiona usuarios
4. **Contenido aprobado** → Aparece en páginas públicas

## ⚠️ Notas Importantes

- Los datos se guardan en localStorage (se pierden si se borra el historial)
- En producción, necesitarías un backend real (Node.js, Django, etc.)
- Los archivos de imagen se guardan como base64 en localStorage (limitar en producción)
- La autenticación es básica - en producción usar JWT o sesiones seguras

## 🛠️ Próximas Mejoras Recomendadas

1. Implementar backend real (Node.js/Express, Firebase, etc.)
2. Base de datos (MongoDB, PostgreSQL, etc.)
3. Cargar imágenes a servidor de archivos (AWS S3, etc.)
4. Autenticación segura con tokens JWT
5. Sistema de roles más granular
6. Editor de contenido WYSIWYG
7. Búsqueda y filtros avanzados
8. Sistema de comentarios
9. Notificaciones por email

---

**Versión**: 1.0  
**Última actualización**: 2025-01-17
