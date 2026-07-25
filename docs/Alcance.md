# Alcance del Sistema - Kuska (Hackathon MVP)

## Objetivo

Kuska es una plataforma móvil de apoyo a la respuesta ante desastres sísmicos que utiliza **Gemma 4** para transformar fotografías, videos y descripciones enviadas por los ciudadanos en información estructurada y priorizada.

El propósito del MVP **no es reemplazar** los sistemas oficiales de monitoreo sísmico como el CENSIS del IGP ni los procesos operativos del INDECI. Kuska busca complementar la etapa posterior al evento sísmico, ayudando a organizar la evidencia ciudadana para facilitar la toma de decisiones.

---

# Problema

Después de un sismo de gran magnitud, los ciudadanos generan cientos o miles de fotografías, videos y reportes a través de diferentes medios.

Esta información suele presentar problemas como:

- Reportes dispersos.
    
- Información duplicada.
    
- Dificultad para identificar las zonas más críticas.
    
- Tiempo elevado para revisar manualmente toda la evidencia.
    

Como consecuencia, los equipos de respuesta deben analizar grandes volúmenes de información antes de poder priorizar las áreas que requieren atención inmediata.

---

# Propuesta de Valor

Kuska utiliza las capacidades multimodales de Gemma 4 para convertir evidencia ciudadana en incidentes estructurados.

En lugar de visualizar cientos de fotografías individuales, los operadores obtienen:

- Incidentes clasificados.
    
- Nivel de gravedad.
    
- Posibles riesgos observados.
    
- Explicación generada por IA.
    
- Priorización preliminar.
    

---

# Alcance Funcional del MVP

## Aplicación móvil

La aplicación permitirá que cualquier ciudadano pueda registrar un incidente mediante:

- Fotografías.
    
- Video corto (opcional).
    
- Descripción escrita.
    
- Ubicación GPS automática.
    

La aplicación estará diseñada bajo el principio **offline-first**, permitiendo registrar incidentes incluso cuando no exista conectividad inmediata.

Los reportes permanecerán almacenados localmente hasta que puedan sincronizarse.

---

## Procesamiento mediante Gemma 4

Una vez recibido el reporte por la plataforma, Gemma 4 analizará conjuntamente:

- Fotografías.
    
- Video.
    
- Descripción.
    
- Contexto del incidente.
    

Como resultado generará una clasificación preliminar considerando:

- Tipo de incidente.
    
- Nivel de daño observado.
    
- Posibles personas atrapadas.
    
- Riesgos secundarios observables.
    
- Nivel de prioridad.
    
- Explicación del razonamiento utilizado.
    

Gemma 4 constituye el núcleo del sistema y representa el principal componente de inteligencia del proyecto.

---

## Dashboard

El sistema dispondrá de un panel web para visualizar:

- Mapa de incidentes.
    
- Lista priorizada.
    
- Evidencia multimedia.
    
- Explicación generada por Gemma.
    
- Estado del incidente.
    

El objetivo del dashboard es facilitar una visualización organizada de la información recopilada.

---

# Arquitectura General

```
Ciudadano

↓

Aplicación móvil Kuska

↓

Almacenamiento local

↓

Sincronización cuando exista conectividad

↓

Backend

↓

Gemma 4

↓

Motor de priorización

↓

Dashboard de incidentes
```

---

# Funcionalidades Incluidas

## Aplicación móvil

- Registro de incidentes.
    
- Captura de fotografías.
    
- Captura de video corto.
    
- Descripción textual.
    
- Obtención automática de GPS.
    
- Almacenamiento local.
    
- Sincronización automática cuando exista conectividad.
    

## Plataforma

- Recepción de reportes.
    
- Procesamiento multimodal con Gemma 4.
    
- Clasificación preliminar de incidentes.
    
- Priorización.
    
- Visualización geográfica.
    

---

# Funcionalidades Fuera del Alcance

El MVP **no contempla** las siguientes funcionalidades:

- Integración directa con CENSIS.
    
- Integración con INDECI.
    
- Integración con Bomberos.
    
- Integración con Policía Nacional.
    
- Integración con Fuerzas Armadas.
    
- Despacho automático de recursos.
    
- Predicción de terremotos.
    
- Evaluación estructural certificada de edificaciones.
    
- Detección garantizada de víctimas.
    
- Sistema de autenticación complejo.
    
- Chat entre rescatistas.
    
- Administración completa del sistema.
    
- Historial de emergencias.
    
- Aplicación para iOS.
    

Estas funcionalidades podrán evaluarse como trabajo futuro.

---

# Restricciones del MVP

El sistema asumirá que:

- Puede existir baja o nula conectividad.
    
- La información enviada por ciudadanos requiere validación.
    
- Los resultados generados por Gemma 4 constituyen apoyo para la toma de decisiones y no reemplazan la validación humana.
    

---

# Público Objetivo

## Usuarios ciudadanos

Personas que presencien daños ocasionados por un sismo y deseen reportarlos mediante evidencia multimedia.

## Operadores

Personal encargado de analizar los incidentes registrados para obtener una visión organizada de las zonas afectadas.

---

# Resultado Esperado

Al finalizar la hackathon, Kuska deberá demostrar que es capaz de:

1. Registrar un incidente desde un dispositivo móvil.
    
2. Funcionar aun cuando inicialmente no exista conexión.
    
3. Sincronizar el reporte cuando la conectividad esté disponible.
    
4. Procesar fotografías, video y texto utilizando Gemma 4.
    
5. Generar una clasificación explicable del incidente.
    
6. Mostrar el resultado en un dashboard georreferenciado.
    

---

# Visión Futura

En una versión posterior, Kuska podría incorporar:

- Agrupación automática de reportes duplicados.
    
- Comunicación entre dispositivos cercanos para retransmitir reportes en ausencia de internet.
    
- Integración con fuentes oficiales de eventos sísmicos.
    
- Integración con plataformas institucionales de respuesta a emergencias.
    
- Análisis colaborativo de múltiples reportes sobre un mismo incidente.
    
- Recomendación de recursos de atención según la evidencia disponible.
    

---

# Declaración del Proyecto

> **Kuska no pretende reemplazar al CENSIS ni al INDECI. Aprovecha la evidencia ciudadana generada después de un sismo y utiliza Gemma 4 para transformarla en información estructurada y priorizada, facilitando una comprensión más rápida de los daños observados y apoyando la toma de decisiones durante la respuesta a la emergencia.**