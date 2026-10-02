var builder = WebApplication.CreateBuilder(args);

// Register controllers service for the API endpoints
builder.Services.AddControllers();

// Register OpenAPI and Swagger services for API documentation and endpoint exploration
builder.Services.AddOpenApi();
builder.Services.AddSwaggerGen();

// Configure CORS policy to allow cross-origin requests from the frontend client
builder.Services.AddCors(options =>
{
    options.AddPolicy("WildfireWeb", policy =>
    {
        policy.WithOrigins("http://127.0.0.1:5500")
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

var app = builder.Build();

app.UseCors("WildfireWeb");

// Configure Swagger and OpenAPI middleware for API documentation UI
app.MapOpenApi();
app.UseSwagger();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "WildfireApi v1");
});

app.UseHttpsRedirection();
app.UseAuthorization();
app.MapControllers();

app.Run();