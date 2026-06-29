# Stage 1: Build stage
FROM eclipse-temurin:25-jdk-alpine AS build
WORKDIR /app

# Copy gradle wrapper files
COPY gradlew .
COPY gradlew.bat .
COPY gradle gradle
COPY build.gradle .
COPY settings.gradle .

# Copy source code
COPY src src

# Make gradlew executable and build the jar
RUN chmod +x gradlew && ./gradlew build -x test --no-daemon

# Stage 2: Runtime stage
FROM eclipse-temurin:25-jre-alpine
WORKDIR /app

# Create data directory for database/photos storage
RUN mkdir -p data

# Copy the built jar from stage 1
COPY --from=build /app/build/libs/traders-0.0.1-SNAPSHOT.jar app.jar

# Expose port 8080
EXPOSE 8080

# Launch the Spring Boot application
ENTRYPOINT ["java", "-jar", "app.jar"]
