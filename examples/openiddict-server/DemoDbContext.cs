using Microsoft.EntityFrameworkCore;

namespace OpenIddictDemo;

internal sealed class DemoDbContext(DbContextOptions<DemoDbContext> options) : DbContext(options);
