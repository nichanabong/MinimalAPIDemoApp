using Microsoft.EntityFrameworkCore;
using MinimalAPIDemoApp;

var builder = WebApplication.CreateBuilder(args);

var dbPath = Path.Combine(builder.Environment.ContentRootPath, "products.db");

builder.Services.AddDbContext<ProductContext>(options =>
    options.UseSqlite($"Data Source={dbPath}"));

// Add services to the container.

//builder.Services.AddControllers();
//// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi
//builder.Services.AddOpenApi();

var app = builder.Build();

app.UseDefaultFiles();  // serves index.html by default
app.UseStaticFiles();   // serves wwwroot/*

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProductContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/products", async (ProductContext db) =>
{
    return await db.Products.ToListAsync();
}).WithName("GetAllProducts").Produces<List<Product>>(StatusCodes.Status200OK);

app.MapGet("/products/{id}", async (int id, ProductContext db) =>
{
    return await db.Products.FindAsync(id) is Product product
        ? Results.Ok(product)
        : Results.NotFound();
}).WithName("GetProductById").Produces<Product>(StatusCodes.Status200OK).Produces(StatusCodes.Status404NotFound);

app.MapPost("/products", async (Product product, ProductContext db) =>
{
    db.Products.Add(product);
    await db.SaveChangesAsync();
    return Results.Created($"/products/{product.Id}", product);
}).WithName("CreateProduct").Produces<Product>(StatusCodes.Status201Created);

//app.MapPatch("/products/{id}", async (int id, Product updatedProduct, ProductContext db) =>
//{
//    var product = await db.Products.FindAsync(id);
//    if (product is null) return Results.NotFound();
//    if (!string.IsNullOrEmpty(updatedProduct.Name))
//        product.Name = updatedProduct.Name;
//    if (updatedProduct.Price > 0)
//        product.Price = updatedProduct.Price;
//    await db.SaveChangesAsync();
//    return Results.NoContent();
//}).WithName("PatchProduct").Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status404NotFound);

app.MapPut("/products/{id}", async (int id, Product updatedProduct, ProductContext db) =>
{
var product = await db.Products.FindAsync(id);
if (product is null) return Results.NotFound();
    product.Name = updatedProduct.Name;
    product.Price = updatedProduct.Price;
    await db.SaveChangesAsync();
    return Results.NoContent();
}).WithName("UpdateProduct").Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status404NotFound);

app.MapDelete("/products/{id}", async (int id, ProductContext db) =>
{
var product = await db.Products.FindAsync(id);
if (product is null) return Results.NotFound();
    db.Products.Remove(product);
    await db.SaveChangesAsync();
    return Results.NoContent();
}).WithName("DeleteProduct").Produces(StatusCodes.Status204NoContent).Produces(StatusCodes.Status404NotFound);

app.MapGet("/images-list", (IWebHostEnvironment env) =>
{
    var folder = Path.Combine(env.WebRootPath, "images");
    Directory.CreateDirectory(folder);

    var files = Directory.GetFiles(folder)
        .Select(Path.GetFileName)
        .Select(name => new { url = $"/images/{name}", fileName = name });

    return Results.Ok(files);
});

app.MapPatch("/products/{id}", async (int id, Product updatedProduct, ProductContext db) =>
{
    var product = await db.Products.FindAsync(id);
    if (product is null)
        return Results.NotFound();

    if (!string.IsNullOrWhiteSpace(updatedProduct.Name))
        product.Name = updatedProduct.Name;

    if (updatedProduct.Price > 0)
        product.Price = updatedProduct.Price;

    if (!string.IsNullOrWhiteSpace(updatedProduct.ImageUrl))
        product.ImageUrl = updatedProduct.ImageUrl;

    await db.SaveChangesAsync();

    return Results.NoContent();
});

app.MapPost("/uploadimage", async (IFormFile file, IWebHostEnvironment env) =>
{
    if (file == null || file.Length == 0)
    {
        return Results.BadRequest("No file uploaded.");
    }

    // Use a unique file name to prevent overwriting existing files
    var fileName = Path.GetRandomFileName() + Path.GetExtension(file.FileName);

    // Define the upload path (e.g., wwwroot/images)
    var uploadsFolder = Path.Combine(env.WebRootPath, "images");
    Directory.CreateDirectory(uploadsFolder); // Create directory if it doesn't exist

    var filePath = Path.Combine(uploadsFolder, fileName);

    // Save the file to the specified path
    using (var stream = new FileStream(filePath, FileMode.Create))
    {
        await file.CopyToAsync(stream);
    }

    // Return the relative URL of the saved image
    var imageUrl = $"/images/{fileName}";
    return Results.Ok(new { Url = imageUrl, FileName = fileName, Size = file.Length });

}).DisableAntiforgery()
  .Accepts<IFormFile>("multipart/form-data")
  .Produces(200, typeof(object))
  .Produces(400);


app.Run();

//// Configure the HTTP request pipeline.
//if (app.Environment.IsDevelopment())
//{
//    app.MapOpenApi();
//}

//app.UseHttpsRedirection();

//app.UseAuthorization();

//app.MapControllers();

//app.Run();
